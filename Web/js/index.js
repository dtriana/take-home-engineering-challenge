
//The maximum zoom level to cluster data point data on the map.
var maxClusterZoomLevel = 11;

//The URL to the store location data.
var storeLocationDataUrl = 'data/data.csv';

//The URL to the icon image. 
var iconImageUrl = 'images/CoffeeIcon.png';

var map, closestMarker, foodTrucks = [];
var listItemTemplate = '<div class="listItem" onclick="itemSelected(\'{id}\')"><div class="listItem-title">{title}</div>{city}<br />Open until {closes}<br />{distance} miles away</div>';

function initialize() {
    //The bounding box to limit the map view to. Format [West, South, East, North]
    var boundingBox = [-122.54, 37.65, -122.3, 37.82];

    map = new atlas.Map('myMap', {
        //center: [-122.4194, 37.7749],
        maxBounds: boundingBox,
        center: atlas.data.BoundingBox.getCenter(boundingBox),
        view: 'Auto',

        //Add authentication details for connecting to Azure Maps.
        authOptions: {
            //Use Azure Active Directory authentication.
            authType: 'anonymous',
            clientId: "642260f2-b07e-43ff-849a-2a9b6362d5ac", //Your Azure Active Directory client id for accessing your Azure Maps account.
            getToken: function (resolve, reject, map) {
                //URL to your authentication service that retrieves an Azure Active Directory Token.
                var tokenServiceUrl = "/Common/Token";
                fetch(tokenServiceUrl).then(r => r.text()).then(token => resolve(token));
            }
        }
    });

    //Create a popup but leave it closed so we can update it and display it later.
    popup = new atlas.Popup();

    //Wait until the map resources are ready.
    map.events.add('ready', function () {

        //Load all the store data now that the data source has been defined. 
        loadStoreData();

        map.events.add('click', getClosestMarker);

    });
}

function getClosestMarker(e) {

    //Reset the color of any previously closest point.
    map.markers.clear();
    document.getElementById('listPanel').innerHTML = '';

    var minDistance = Infinity;

    for (var i = 0; i < foodTrucks.length; i++) {
        //Calculate the distance between marker and the position.
        var coord = [foodTrucks[i].longitude, foodTrucks[i].latitude];
        var distance = atlas.math.getDistanceTo(new atlas.data.Point(coord), e.position, 'miles');
        foodTrucks[i].distance = distance;
    }

    closestMarker = (foodTrucks.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance))).slice(0,5);

    
    if (closestMarker) {
        var markers = [], divtext= '';
        closestMarker.forEach(c => {
            var m = new atlas.HtmlMarker({
                position: [c.longitude, c.latitude],
                color: 'red'
            });
            m.properties = { id: c.id };
            markers.push(m);
            divtext += ` - Marker Id: ${c.id}<br/> - Distance: ${(c.distance).toFixed(2)} miles</br>`;
        });
        map.markers.add(markers);
        //Display details about closest point.
        document.getElementById('listPanel').innerHTML = divtext;
    }
}

function loadStoreData() {
    //Download the store location data.
    fetch(storeLocationDataUrl)
        .then(response => response.text())
        .then(function (text) {

            //Parse the Tab delimited file data into GeoJSON features.
            var features = [];

            //Split the lines of the file.
            var lines = text.split('\n');

            //Grab the header row.
            var row = lines[0].split(',');

            //Parse the header row and index each column, so that when our code for parsing each row is easier to follow.
            var header = {};
            var numColumns = row.length;
            var i;

            for (i = 0; i < row.length; i++) {
                header[row[i]] = i;
            }

            var markers = [];
            //Skip the header row and then parse each row into a GeoJSON feature.
            for (i = 1; i < lines.length; i++) {
                
                row = lines[i].split(',');
                if (row[1].includes('"')) continue;
                //Ensure that the row has the right number of columns.
                if (row.length >= numColumns) {
                    var truck = {
                        longitude: row[header['Longitude']],
                        latitude : row[header['Latitude']],
                        id: row[header['locationid']]
                    }

                    foodTrucks.push(truck);
                }
            }
        });
}

function updateListItems() {

    //Get the current camera/view information for the map.
    var camera = map.getCamera();

    var listPanel = document.getElementById('listPanel');

    //Check to see if the user is zoomed out a lot. If they are, tell them to zoom in closer, perform a search or press the My Location button.
    if (camera.zoom < maxClusterZoomLevel) {
        //Close the popup as clusters may be displayed on the map. 
        popup.close();

        listPanel.innerHTML = '<div class="statusMessage">Search for a location, zoom the map, or press the "My Location" button to see individual locations.</div>';
    } else {
        //Update the location of the centerMarker.
        centerMarker.setOptions({
            position: camera.center,
            visible: true
        });

        //List the ten closest locations in the side panel.
        var html = [], properties;

        /*
            Generating HTML for each item that looks like this:
         
            <div class="listItem" onclick="itemSelected('id')">
                <div class="listItem-title">1 Microsoft Way</div>
                Redmond, WA 98052<br />
                Open until 9:00 PM<br />
                0.7 miles away
            </div>
         */

        //Get all the shapes that have been rendered in the bubble layer. 
        var data = map.layers.getRenderedShapes(map.getCamera().bounds, [iconLayer]);

        //Create an index of the distances of each shape.
        var distances = {};

        data.forEach(function (shape) {
            if (shape instanceof atlas.Shape) {

                //Calculate the distance from the center of the map to each shape and store in the index. Round to 2 decimals.
                distances[shape.getId()] = Math.round(atlas.math.getDistanceTo(camera.center, shape.getCoordinates(), 'miles') * 100) / 100;
            }
        });

        //Sort the data by distance.
        data.sort(function (x, y) {
            return distances[x.getId()] - distances[y.getId()];
        });

        data.forEach(function (shape) {
            properties = shape.getProperties();

            html.push('<div class="listItem" onclick="itemSelected(\'', shape.getId(), '\')"><div class="listItem-title">',
                properties['AddressLine'],
                '</div>',

                //Get a formatted address line 2 value that consists of City, Municipality, AdminDivision, and PostCode.
                getAddressLine2(properties),
                '<br />',

                //Convert the closing time into a nicely formated time.
                getOpenTillTime(properties),
                '<br />',

                //Get the distance of the shape.
                distances[shape.getId()],
                ' miles away</div>');
        });

        listPanel.innerHTML = html.join('');

        //Scroll to the top of the list panel incase the user has scrolled down.
        listPanel.scrollTop = 0;
    }
}

//When a user clicks on a result in the side panel, look up the shape by its id value and show popup.
function itemSelected(id) {
    //Get the shape from the data source using it's id. 
    var shape = datasource.getShapeById(id);
    showPopup(shape);

    //Center the map over the shape on the map.
    var center = shape.getCoordinates();
    var offset;

    //If the map is less than 700 pixels wide, then the layout is set for small screens.
    if (map.getCanvas().width < 700) {
        //When the map is small, offset the center of the map relative to the shape so that there is room for the popup to appear.
        offset = [0, -80];
    }

    map.setCamera({
        center: center,
        centerOffset: offset
    });
}

function showPopup(shape) {
    var properties = shape.getProperties();

    /*
        Generating HTML for the popup that looks like this:

         <div class="storePopup">
                <div class="popupTitle">
                    3159 Tongass Avenue
                    <div class="popupSubTitle">Ketchikan, AK 99901</div>
                </div>
                <div class="popupContent">
                    Open until 22:00 PM<br/>
                    <img title="Phone Icon" src="images/PhoneIcon.png">
                    <a href="tel:1-800-XXX-XXXX">1-800-XXX-XXXX</a>
                    <br>Amenities:
                    <img title="Wi-Fi Hotspot" src="images/WiFiIcon.png">
                    <img title="Wheelchair Accessible" src="images/WheelChair-small.png">
                </div>
            </div>
     */

    //Calculate the distance from the center of the map to the shape in miles, round to 2 decimals.
    var distance = Math.round(atlas.math.getDistanceTo(map.getCamera().center, shape.getCoordinates(), 'miles') * 100) / 100;

    var html = ['<div class="storePopup">'];

    html.push('<div class="popupTitle">',
        properties['AddressLine'],
        '<div class="popupSubTitle">',
        getAddressLine2(properties),
        '</div></div><div class="popupContent">',

        //Convert the closing time into a nicely formated time.
        getOpenTillTime(properties),

        //Add the distance information.  
        '<br/>', distance,
        ' miles away',
        '<br /><img src="images/PhoneIcon.png" title="Phone Icon"/><a href="tel:',
        properties['Phone'],
        '">',
        properties['Phone'],
        '</a>'
    );

    if (properties['IsWiFiHotSpot'] || properties['IsWheelchairAccessible']) {
        html.push('<br/>Amenities: ');

        if (properties['IsWiFiHotSpot']) {
            html.push('<img src="images/WiFiIcon.png" title="Wi-Fi Hotspot"/>');
        }

        if (properties['IsWheelchairAccessible']) {
            html.push('<img src="images/WheelChair-small.png" title="Wheelchair Accessible"/>');
        }
    }

    html.push('</div></div>');

    //Update the content and position of the popup for the specified shape information.
    popup.setOptions({
        //Create a table from the properties in the feature.
        content: html.join(''),
        position: shape.getCoordinates()
    });

    //Open the popup.
    popup.open(map);
}

//Initialize the application when the page is loaded.
window.onload = initialize;
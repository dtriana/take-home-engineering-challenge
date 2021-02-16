
//The maximum zoom level to cluster data point data on the map.
var maxClusterZoomLevel = 11;

//The URL to the store location data.
var storeLocationDataUrl = './data/data.csv';

var map, closestMarker, foodTrucks = [];
var listItemTemplate = '<div class="listItem" onclick="itemSelected(\'{id}\')"><div class="listItem-title">{title}</div>{city}<br />Open until {closes}<br />{distance} miles away</div>';

function initialize() {
    //The bounding box to limit the map view to. Format [West, South, East, North]
    var sanFranciscoBounds = [-122.54, 37.65, -122.3, 37.82];

    map = new atlas.Map('myMap', {
        maxBounds: sanFranciscoBounds,
        center: atlas.data.BoundingBox.getCenter(sanFranciscoBounds),
        view: 'Auto',

        //Add authentication details for connecting to Azure Maps.
        authOptions: {
            //Use Azure Active Directory authentication.
            authType: 'anonymous',
            clientId: "642260f2-b07e-43ff-849a-2a9b6362d5ac", //Your Azure Active Directory client id for accessing your Azure Maps account.
            getToken: function (resolve, reject, map) {
                //URL to your authentication service that retrieves an Azure Active Directory Token.
                var tokenServiceUrl = "https://maptoken.azurewebsites.net/api/MapToken";
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

    for (var i = 0; i < foodTrucks.length; i++) {
        var coord = [foodTrucks[i].longitude, foodTrucks[i].latitude];
        var distance = atlas.math.getDistanceTo(new atlas.data.Point(coord), e.position, 'miles');
        foodTrucks[i].distance = distance;
    }

    closestMarker = (foodTrucks.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance))).slice(0,5);

    
    if (closestMarker) {
        var markers = [], divtext= '';
        closestMarker.forEach((c, i) => {
            var m = new atlas.HtmlMarker({
                position: [c.longitude, c.latitude],
                color: 'red',
                text: i + 1
            });
            m.properties = { id: c.id };
            markers.push(m);
            divtext += `<h2>${i + 1}</h2><b>${c.applicant}</b><br/><b>Distance:</b> ${(c.distance).toFixed(2)} miles</br><b>Open:</b> ${c.hours}</br><b>Food:</b> ${c.food}</br>`;
        });

        var you = new atlas.HtmlMarker({
            position: e.position,
            color: 'blue',
            text: 'you'
        });

        markers.push(you);
        map.markers.add(markers);
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
                        id: row[header['locationid']],
                        applicant : row[header['Applicant']],
                        hours : row[header['dayshours']],
                        food: row[header['FoodItems']]
                    }

                    foodTrucks.push(truck);
                }
            }
        });
}

//Initialize the application when the page is loaded.
window.onload = initialize;

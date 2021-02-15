using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Azure.Services.AppAuthentication;

namespace CseHomeWork.Maps
{
    public static class MapToken
    {
        [FunctionName("MapToken")]
        public static async Task<IActionResult> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequest req,
            ILogger log)
        {
            log.LogInformation("C# HTTP trigger function processed a request.");
            var tokenProvider = new AzureServiceTokenProvider();
            if (req.Host.Value.StartsWith("davidtriana.com"))
            {
                try
                {
                    var theToken = await tokenProvider.GetAccessTokenAsync("https://atlas.microsoft.com/");
                    return new OkObjectResult(theToken);
                }
                catch
                {
                    return new BadRequestResult();
                }
            }
            else
            {
                return new UnauthorizedResult();
            }
        }
        }
    }

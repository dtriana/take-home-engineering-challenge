using System.Threading.Tasks;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Azure.Services.AppAuthentication;
using System;

namespace CseHomeWork.Maps
{
    public static class MapToken
    {
        [FunctionName("MapToken")]
        public static async Task<string> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = null)] HttpRequest req,
            ILogger log)
        {
            log.LogInformation("C# HTTP trigger function processed a request.");
            var tokenProvider = new AzureServiceTokenProvider();
            if (req.Host.Value.StartsWith("davidtriana.com"))
            {
                try
                {
                    var theToken = await tokenProvider.GetAccessTokenAsync("https://atlas.microsoft.com/");
                    return theToken;
                }
                catch(Exception ex)
                {
                    log.LogCritical(ex, $"Map request from {req.Host} fail {ex.Message}");
                    throw ex;
                }
            }
            else
            {
                throw new System.Exception($"Unauthorized -  {req.Host}");
            }
        }
    }
}


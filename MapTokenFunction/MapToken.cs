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
            var referer = req.GetTypedHeaders().Referer.ToString();
            log.LogInformation($"MapToken called from {referer}");
            if (referer == "https://davidtriana.com/")
            {
                try
                {
                    var tokenProvider = new AzureServiceTokenProvider();
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


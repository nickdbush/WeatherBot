var t = require('twit'),
    priv = require('./private'),
    twit = new t(priv.twitter),
    request = require('request'),
    urlencode = require('urlencode');

var definition = 3;

var stream = twit.stream('user');

stream.on('tweet', function (tweet) {
    var location = getBody(tweet.text);
    //Get weather information
    request('http://api.openweathermap.org/data/2.5/forecast?q=' + urlencode(location) + '&mode=json&appid=' + priv.weather.api_token, function (err, response, body) {
        if(!err && response.statusCode == 200) {
            var forecast = generateHumanForecast(JSON.parse(body));
            var status = "@" + tweet.user.screen_name + " " + forecast;
            twit.post('statuses/update', {status: status}, function (err, data, response) {
                if(err) console.error(err);
            });
        }
    });
});

function generateHumanForecast(forecast) {
    var list = forecast["list"];
    var read = "the forecast is ";
    for(var i = 0; i < definition; i++) {
        var prediction = list[i].weather[0].main.toLowerCase();
        if(i < definition - 1) read += prediction + ", ";
        else read += "and " + prediction
    }
    return read + " over the next " + (definition * 3) + " hours";
}

function getBody(tweet) {
    return tweet.replace(/@\w+|#\w+/g, "").trim();
}
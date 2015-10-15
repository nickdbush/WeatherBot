var t = require('twit'),
    string = require('string'),
    priv = require('./private'),
    twit = new t(priv.twitter),
    request = require('request'),
    urlencode = require('urlencode');

var definition = 3;

var stream = twit.stream('user');
stream.on('tweet', function (tweet) {
    //Send hashes where they need to go
    var hashes = tweet.entities.hashtags || [];
    for (var i = 0; i < hashes.length; i++) {
        switch (hashes[i].text) {
            case "weather":
                weather(tweet);
                break;
            case "film":
                film(tweet);
                break;
        }
    }
});

function film(tweet) {
    var year = /\((\d+)\)/g.exec(tweet.text);
    if (year) year = year[1] || "";
    var text = body(tweet);
    var film = /(.+) \(/g.exec(text);
    if(film && film[1]) film = film[1];
    else film = text;
    request('http://www.omdbapi.com/?t=' + urlencode(film) + '&y=' + urlencode(year) + '&plot=short&r=json', function (err, response, body) {
        if (!err && response.statusCode == 200 && JSON.parse(body).Response != 'False') {
            var summary = generateHumanSummary(body, tweet.user.screen_name.length + 1);
            sendTweet(tweet.user.screen_name, summary);
        }
    });
}

function weather(tweet) {
    var location = body(tweet);
    //Get weather information
    request('http://api.openweathermap.org/data/2.5/forecast?q=' + urlencode(location) + '&mode=json&appid=' + priv.weather.api_token, function (err, response, body) {
        if (!err && response.statusCode == 200) {
            var forecast = generateHumanForecast(JSON.parse(body));
            sendTweet(tweet.user.screen_name, forecast);
        }
    });
}

function sendTweet(user, status) {
    twit.post('statuses/update', {status: "@" + user + " " + status}, function (err, data, response) {
        if (err) console.error(err);
    });
}

function body(tweet) {
    return tweet.text.replace(/@\w+|#\w+/ig, "").trim();
}

function generateHumanSummary(body, charstomiss) {
    body = JSON.parse(body);
    body.Director.replace("N/A", "");
    body.Actors.replace("N/A", "");
    var director = "";
    if (body.Director.trim()) director += "was directed by " + body.Director.trim();
    var cast = string(body.Actors).parseCSV();
    var stars = "";
    if (cast.length > 0) stars += "stars " + cast[0];
    if (cast.length > 1) stars += " and " + cast[1];
    var linker;
    if (director != "" && cast != "") linker = " and ";
    return string(body.Title.trim() + " (" + body.Year.trim() + ") " + director + linker + stars + "").truncate(116 - charstomiss).s + " http://imdb.com/title/" + body.imdbID;
}

function generateHumanForecast(forecast) {
    var list = forecast["list"];
    var read = "the forecast is ";
    for (var i = 0; i < definition; i++) {
        var prediction = list[i].weather[0].main.toLowerCase();
        if (i < definition - 1) read += prediction + ", ";
        else read += "and " + prediction
    }
    return read + " over the next " + (definition * 3) + " hours";
}
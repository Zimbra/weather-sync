var express = require('express'),
	cors = require('cors'),
	proxy = require('http-proxy-middleware'),
	morgan = require('morgan');

var WEATHER_KEY = process.env.WEATHER_KEY;
var IP_KEY = process.env.IP_KEY;

var app = express();

app.set('trust proxy', true);

function getIp(req) {
	var fwd = req.headers['x-forwarded-for'],
		ip = req.ip;
	if (fwd) {
		ip = fwd.split(',').pop() || ip;
	}
	if (ip==='::1') ip = '0.0.0.0';
	return ip;
}

// allow x-forwarded-for from Heroku
app.use(function(req, res, next) {
	req.ip = getIp(req);
	next();
});

// log standard apache format to stderr
app.use(morgan('combined'));

// enable CORS
app.use( cors({
	maxAge: 1728000
}) );

// proxy to GeoIP API
app.get('/ip', function(req, res, next) {
	req.url = req.url.replace(/\/*$/g, '/' + encodeURIComponent(getIp(req)) + '?access_key='+IP_KEY);
	next();
}, proxy('/ip', {
	target: 'http://api.ipapi.com',
	changeOrigin: true,
	pathRewrite: {
		'^/ip': '/api'
	}
}));

// proxy to weather API
app.get('/weather/:geo', proxy('/', {
	target: 'http://api.openweathermap.org',
	xfwd: true,
	changeOrigin: true,
	pathRewrite: {
		'^/weather/([0-9.-]*?),([0-9.-]*?)/?$': '/data/2.5/weather?lat=$1&lon=$2&appid='+WEATHER_KEY
	}
}));

// accept requests on PORT
app.listen(process.env.PORT || 8080);

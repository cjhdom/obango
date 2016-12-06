var express = require('express');
var router = express.Router();
var MongoClient = require('mongodb').MongoClient;

var url = 'mongodb://localhost:27017/obango';


//대한민국 경도범위는 124 – 132, 위도범위는 33 – 43 이다.
//범위 +- 10미터
//37.496000~37.500000 +- 0.00009
//127.029000~127.031000 +- 0.000115

/* GET home page. */
router.get('/', function(req, res, next) {
  var longitude;
  var latitude;
  try {
    longitude = Number(req.query.longitude);
    latitude = Number(req.query.latitude);
  } catch (e) {
    res.send('error in type casting');
  }

  if (longitude && latitude) {
    res.render('temp.html', {latitude, longitude});
  } else {
    res.send('?longitude=&latitude=');
  }
});

router.get('/fetch', (req, res, next) => {
  try {
    var longitude = Number(req.query.longitude);
    var latitude = Number(req.query.latitude);
  } catch (e) {
    res.json({ok:0});
  }

  console.log(longitude + ',' + latitude);

  MongoClient.connect(url, function(err, db) {
    if (err) {
      res.send(JSON.stringify(err));
    } else {
      var col = db.collection('coupon');

      col.geoNear(longitude, latitude, {
        maxDistance: 0.00005 / 6.3781, spherical: true, num: 20
      }, function (err, coupons) {
        if (err) {
          res.json(err);
        } else {
          res.json(coupons);
        }
      });
    }
  })
});

router.get('/fetch/all', (req, res, next) => {
  MongoClient.connect(url, function(err, db) {
    if (err) {
      res.send(JSON.stringify(err));
    } else {
      var col = db.collection('coupon');

      col.find({}).toArray(function (err, items) {
        if (err) {
          res.send('error ' + JSON.stringify(err));
        } else {
          res.json(items);
        }
      })
    }
  })
});

module.exports = router;

function createRandomCoupon() {
  MongoClient.connect(url, function(err, db) {
    if (err) {
      res.send(JSON.stringify(err));
    } else {
      // Create a collection we want to drop later
      var col = db.collection('coupon');
      // Show that duplicate records got dropped
      for (var i = 0; i < 1000; i++) {
        var coupon = {
          desc: 'test coupon ' + i,
          count: 1,
          loc: {
            longitude: getRandomLongitude(),
            latitude: getRandomLatitude()
          }
        };

        console.log(JSON.stringify(coupon));
        col.insert(coupon, (err) => {
          if (err) {
            console.log(JSON.stringify(err));
          }
        });
      }
      db.close();
    }
  });
}

function getRandomLatitude() {
  return Math.floor((Math.random() * 4 + 37496) * 1000) / 1000000;
}

function getRandomLongitude() {
  return Math.floor((Math.random() * 2 + 127029) * 1000) / 1000000;
}
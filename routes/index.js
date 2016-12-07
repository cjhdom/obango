var express = require('express');
var router = express.Router();
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;

const url = 'mongodb://localhost:27017/obango';

var ip = null;
if( process.env.NODE_ENV == 'production' ) {
  ip = 'http://52.185.153.207';
} else if( process.env.NODE_ENV == 'development' ) {
  ip = 'http://localhost:3000';
}

console.log(process.env.NODE_ENV);

//대한민국 경도범위는 124 – 132, 위도범위는 33 – 43 이다.
//범위 +- 10미터
//37.496000~37.500000 +- 0.00009
//127.029000~127.031000 +- 0.000115

///////////////////////////////////////////////////
// WEBPAGE
///////////////////////////////////////////////////

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
    res.render('temp.html', {latitude, longitude, ip});
  } else {
    res.send('?longitude=&latitude=');
  }
});

router.get('/admin', function(req, res, next) {
  res.render('admin.html', {ip});
});


///////////////////////////////////////////////////
// API
///////////////////////////////////////////////////

/**
 * add coupon
 */
router.post('/coupon', (req, res, next) => {
  var longitude = Number(req.body.longitude);
  var latitude = Number(req.body.latitude);
  var desc = req.body.desc;
  var count = req.body.count;
  var loc = {
    longitude,
    latitude
  };

  console.log(longitude + ',' + latitude);

  MongoClient.connect(url, function(err, db) {
    if (err) {
      res.send({
        ok: -1
      });
    } else {
      var col = db.collection('coupon');

      var coupon = {
        desc,
        count,
        loc
      };

      col.insertOne(coupon, function (err, r) {
        if (err) {
          res.json(err);
        } else {
          res.json({
            ok: 1,
            id: r.insertedId
          });
        }
        db.close();
      });
    }
  });
});

/**
 * delete coupon
 */
router.delete('/coupon', (req, res, next) => {
  var id = req.body.id;

  console.log('delete ' + id);

  MongoClient.connect(url, function(err, db) {
    if (err) {
      res.send({
        ok: -1
      });
    } else {
      var col = db.collection('coupon');

      col.deleteOne({_id: ObjectId(id)}, function (err, result) {
        if (err) {
          res.json(err);
        } else {
          res.json(result);
        }
        db.close();
      });
    }
  });
});

router.get('/fetch/:type', (req, res, next) => {
  var longitude = null;
  var latitude = null;
  var type = null;

  try {
    longitude = Number(req.query.longitude);
    latitude = Number(req.query.latitude);
    type = req.params.type;
  } catch (e) {
    res.json({ok:0});
  }

  console.log(longitude + ',' + latitude + ',' + type);

  MongoClient.connect(url, function(err, db) {
    if (err) {
      res.send(JSON.stringify(err));
    } else {
      var col = db.collection('coupon');

      var options = {};

      if (type === 'circle') {
        options.maxDistanc = 0.00005 / 6.3781;
        options.spherical = true;
        options.num = 20;
      } else {
        options.maxDistance = 0.0005 / 6.3781;
        options.spherical = true;
      }

      col.geoNear(longitude, latitude, options, function (err, coupons) {
        if (err) {
          res.json(err);
        } else {
          res.json(coupons);
        }
        db.close();
      });
    }
  });
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
        db.close();
      })
    }
  })
});

module.exports = router;

///////////////////////////////////////////////////
// HELPERS
///////////////////////////////////////////////////
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
        col.insertOne(coupon, (err) => {
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
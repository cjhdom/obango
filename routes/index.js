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

//////////////////////////////////////////////////////////////
//대한민국 경도범위는 124 – 132, 위도범위는 33 – 43 이다.
//아래는 강남~역삼 부근 좌표 범위
//범위 +- 10미터
//37.496000~37.500000 +- 0.00009
//127.029000~127.031000 +- 0.000115
/////////////////////////////////////////////////////////////


///////////////////////////////////////////////////
// WEBPAGE
///////////////////////////////////////////////////

/**
 * 메인 페이지 웹뷰 버전
 */
router.get('/', function(req, res, next) {
  var longitude = Number(req.query.longitude);;
  var latitude = Number(req.query.latitude);

  if (longitude && latitude) {
    res.render('temp.html', {latitude, longitude, ip});
  } else {
    res.send('?longitude=&latitude=');
  }
});

/**
 * 어드민 페이지
 */
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
  var count = Number(req.body.count);
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
        loc,
        isUse: false
      };

      col.insertOne(coupon, function (err, r) {
        if (err) {
          res.json(err);
        } else {
          res.json({
            ok: 1,
            id: r.insertedId,
            count: count,
            isUse: false,
            loc
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

/**
 * update coupon
 */
router.put('/coupon', (req, res, next) => {
  var id = req.body.id;
  var latitude = Number(req.body.latitude);
  var longitude = Number(req.body.longitude);

  MongoClient.connect(url, function(err, db) {
    if (err) {
      res.send({
        ok: -1
      });
    } else {
      var col = db.collection('coupon');
      var query = {
        _id: ObjectId(id)
      };

      var updateQuery = {
        $set: {
          loc: {
            longitude,
            latitude
          }
        }
      };

      col.findOneAndUpdate(query, updateQuery)
        .then(result => {
          return res.json(result);
        })
        .catch(result => {
          console.log(JSON.stringify(result));
          return res.json(result);
        });
    }
  });
});

/**
 * 쿠폰을 찾아서 게임 시작
 */
router.post('/coupon/enter', (req, res, next) => {
  var id = req.body.id;

  MongoClient.connect(url, function(err, db) {
    if (err) {
      res.send(JSON.stringify(err));
    } else {
      var col = db.collection('coupon');
      var query = {
        _id: ObjectId(id),
        count: {$gt: 0},
        isUse: false
      };

      var updateQuery = {
        $set: {
          isUse: true
        }
      };

      col.findOneAndUpdate(query, updateQuery)
        .then(result => {
          return res.json(result);
        })
        .catch(result => {
          console.log(JSON.stringify(result));
          return res.json(result);
        });
    }
  });
});

/**
 * 게임 결과
 */
router.post('/coupon/exit/:result', (req, res, next) => {
  var id = req.body.id;
  var result = req.params.result;

  MongoClient.connect(url, function(err, db) {
    if (err) {
      res.send(JSON.stringify(err));
    } else {
      var col = db.collection('coupon');
      var query = {
        _id: ObjectId(id),
        count: {$gt: 0},
        isUse: true
      };

      var updateQuery = {
        $set: {
          isUse: false
        }
      };

      if (result === 'success') {
        updateQuery.$inc = {
          count: -1
        };
      }

      col.findOneAndUpdate(query, updateQuery)
        .then(response => {
          return res.json(response);
        })
        .catch(response => {
          console.log(JSON.stringify(response));
          return res.json(response);
        });
    }
  });
});

/**
 * 중심 좌표로 쿠폰 정보 불러오기
 */
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

  MongoClient.connect(url, function(err, db) {
    if (err) {
      err.ok = 0;
      res.send(JSON.stringify(err));
    } else {
      var col = db.collection('coupon');

      var options = {};

      if (type === 'circle') {
        options.maxDistance = 0.00005 / 6.3781;
        options.spherical = true;
        options.num = 20;
        options.query = {
          count: {$gt: 0},
          isUse: false
        };
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

/**
 * 모든 쿠폰 정보 불러오기
 */
router.get('/fetch/all', (req, res, next) => {
  MongoClient.connect(url, function(err, db) {
    if (err) {
      err.ok = 0;
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
  });
});

module.exports = router;

///////////////////////////////////////////////////
// HELPERS - DB에 랜덤 값을 생성해주는 함수들 (현재 사용 X)
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
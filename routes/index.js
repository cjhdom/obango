var express = require('express');
var router = express.Router();
var MongoClient = require('mongodb').MongoClient;

var url = 'mongodb://localhost:27017/obango';

//대한민국 경도범위는 124 – 132, 위도범위는 33 – 43 이다.

/* GET home page. */
router.get('/', function(req, res, next) {
  MongoClient.connect(url, function(err, db) {
    // Create a collection we want to drop later
    var col = db.collection('test');
    // Show that duplicate records got dropped
    col.find({x:1}).toArray(function(err, items) {
      if (err) {
        res.render('index', { title: 'Express' });
      } else {
        res.send(items);
      }
      db.close();
    });
  });
});

router.post('/fetch', (req, res, next) => {
  var longitude = req.body.longitude;
  var latitude = req.body.latitude;

  
});

module.exports = router;

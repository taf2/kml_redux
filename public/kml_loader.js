if (!Array.prototype.empty) {
  Array.prototype.empty = function() { return this.length == 0; }
}

function getUTF8Length(string) {
    var utf8length = 0;
    for (var n = 0; n < string.length; n++) {
        var c = string.charCodeAt(n);
        if (c < 128) {
            utf8length++;
        }
        else if((c > 127) && (c < 2048)) {
            utf8length = utf8length+2;
        }
        else {
            utf8length = utf8length+3;
        }
    }
    return utf8length;
}

function formatBytes(bytes,decimals) {
   if(bytes == 0) return '0 Byte';
   var k = 1000;
   var dm = decimals + 1 || 3;
   var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
   var i = Math.floor(Math.log(bytes) / Math.log(k));
   return (bytes / Math.pow(k, i)).toPrecision(dm) + ' ' + sizes[i];
}

function reducePointsForCoordinate(coordinate) {
  var time = new Date();
  var points = [];
  var point = []; // build until we have 3, [lat, lng, alt]
  var childNodes = coordinate.childNodes;
  var allcoords = "";
  // build a single string of all so we can accurately split
  for (var i = 0, len = childNodes.length; i < len; ++i) {
    var node = coordinate.childNodes[i];
    var coords = node.nodeValue;//
    allcoords += coords;
  }
  var groups = allcoords.replace(/,\s*/g,',').split(/\s/);
  for (var i = 0, len = groups.length; i < len; ++i) {
    var coords = groups[i].split(',');
    if (coords[0] && coords[1] && coords[2]) {
      points.push(new DP.GeoPoint(coords[0],coords[1],coords[2]));
    }
  }
  //console.log("reduced points in : " + ((new Date().getTime()) - time.getTime()));
  return points;
}

function updateCoordinateText(doc,coordinateNode,points) {
  // update the coordinateNode with the new points
  while (coordinateNode.childNodes.length > 0) {
    coordinateNode.removeChild(coordinateNode.lastChild);
  }
  // rebuild the coordinate node body
  var coords = [];
  for (var i = 0, len = points.length; i < len; ++i) {
    var point = points[i];
    if (point && point.latitude && point.longitude) {
      coords.push(point.latitude + "," + point.longitude);
    }
  }
  var text = doc.createTextNode(coords.join(" "));
  coordinateNode.appendChild(text);
}

var gWorkerPool = [];
var gQueuedWork = [];

function reduceCoordinateSet(tolerance, doc, coordinate,count, totalCoordinates, cb) {

  var points = reducePointsForCoordinate(coordinate);

  //console.log("processing: " + points.length + " points");

  if (points.empty()) {  cb(); return; }

  if (gWorkerPool.empty()) {

    //console.log("all workers busy queue work");

    gQueuedWork.push( {tolerance: tolerance, doc: doc, coordinate: coordinate, count: count, totalCoordinates: totalCoordinates, cb: cb} );

    return; // wait for workers to free up

  }

  //console.log("worker pool: " + gWorkerPool.length);

  var worker = gWorkerPool.pop();

  worker.onmessage = function(event) {

    if (event.data.status == 'done') {
      //console.log(points.length + " -> " + event.data.total + " <= " + totalCoordinates );
      // Should we round here?

      $(event.data.points).each(function(i,o) {
      	latfloat = parseFloat(o.latitude);
      	o.latitude = latfloat.toFixed(parseInt($("#dp-rounding").val()));
      	lonfloat = parseFloat(o.longitude);
      	o.longitude = lonfloat.toFixed(parseInt($("#dp-rounding").val()));
      });

      updateCoordinateText(doc,coordinate,event.data.points);
      cb(coordinate,event.data.points,points);
      gWorkerPool.push(worker);
    }

  }

  worker.onerror = function(error) {
    console.error(error);
    gWorkerPool.push(worker);
  }

  worker.postMessage({points:points,tolerance:tolerance});
}

// main reduceKMLPoints script
function reduceKMLPoints(tolerance, kml) {
  var parser = new DOMParser();  
  var doc = parser.parseFromString(kml, "text/xml");
  var coordinates = doc.getElementsByTagName("coordinates");
  var count = 0;

  // build array to compare against for graph
  var originalCoordinates = [];
  var reducedCoordinates = [];

  if (gWorkerPool.empty()) {
    // spawn 4 workers
    for (var i = 0; i < 4; ++i) {
      var worker = new Worker("/douglas_peucker_worker.js?cc=" + (new Date()).getTime());
      gWorkerPool.push(worker);
    }
    //console.log("workers all started and waiting to process " + coordinates.length + " coordinates");
  }

  // start iterating 
  var iteration = function(coordinate, points, original_points) {

    if (points) { Map.plotPath(points); reducedCoordinates.push(points); } // plot to google maps

    if (original_points) { originalCoordinates.push(original_points); }

    if (count < coordinates.length) {

      //console.log("call reducedCoordinates");

      reduceCoordinateSet(tolerance, doc, coordinates[count], count, coordinates.length, iteration);
    }

    else if (gQueuedWork.length > 0) {

      //console.log("processing queued work: " + gQueuedWork.length);
      
      if (gWorkerPool.length) {
        var work = gQueuedWork.pop();
        reduceCoordinateSet(work.tolerance, work.doc, work.coordinates[work.count], work.count, work.coordinates.length, iteration);
      } else {
        setTimeout(iteration, 500); // spin for a bit until a worker free's up
      }

    } else {
      // done
      // save document to textarea
      try {
        
        var serializer = new XMLSerializer();
        var xml = serializer.serializeToString(doc);
        
        $("#kml-reduced").val(xml);
        $("#xml-size").text(formatBytes(getUTF8Length(xml)));
        $("#kml_output").show();

      } catch(e) { console.error(e); }

    }

    ++count;

  }

  iteration();

  return doc;
}

// callback from upload frame
function KMLloaded(tolerance, kml) {
  $("#kml-reduced").val(kml);
  if (!kml.match(/<kml/) || !kml.match(/<coordinates/)) { alert("Make sure you uploaded a valid KML file"); throw("error"); }
  $("#display").show();
  $("#display").css({visibility:'visible'});
  $("#kml_output").hide();
  Map.clear();
  reduceKMLPoints(tolerance, kml);
}

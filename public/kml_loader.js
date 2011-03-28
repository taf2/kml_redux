if (!Array.prototype.empty) {
  Array.prototype.empty = function() { return this.length == 0; }
}

function reducePointsForCoordinate(coordinate) {
  //var time = new Date();
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
    points.push(new DP.GeoPoint(coords[0],coords[1],coords[2]));
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
      coords.push(point.latitude + "," + point.longitude + "," + point.altitude);
    }
  }
  var text = doc.createTextNode(coords.join("\n"));
  coordinateNode.appendChild(text);
}

var gWorkerPool = [];
var gQueuedWork = [];

function reduceCoordinateSet(tolerance, doc, coordinate,count, totalCoordinates, cb) {
  var points = reducePointsForCoordinate(coordinate);
  //console.log("processing: " + points.length + " points");
  if (points.empty()) { console.log("no points in coordinate?"); cb(); return; }

  if (gWorkerPool.empty()) {
    console.log("all workers busy queue work");
    gQueuedWork.push( {tolerance: tolerance, doc: doc, coordinate: coordinate, count: count, totalCoordinates: totalCoordinates, cb: cb} );
    return; // wait for workers to free up
  }

  //console.log("worker pool: " + gWorkerPool.length);

  var worker = gWorkerPool.pop();

  worker.onmessage = function(event) {
    var percentOfTotal = (event.data.progress* (count/totalCoordinates));
    if ($("#progress").progressbar("value") < percentOfTotal) {
      $("#progress").progressbar({value:percentOfTotal});
    }

    if (event.data.status == 'done') {
      //console.log(points.length + " -> " + event.data.total + " <= " + totalCoordinates );
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

  // spawn 4 workers
  for (var i = 0; i < 4; ++i) {
    var worker = new Worker("/douglas_peucker_worker.js?cc=" + (new Date()).getTime());
    gWorkerPool.push(worker);
  }
  console.log("workers all started and waiting to process " + coordinates.length + " coordinates");

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
      }
      else {
        setTimeout(iteration, 500); // spin for a bit until a worker free's up
      }

    }
    else {
      // done
      console.log("done");

      $("#progress").progressbar({value:100});

      // save document to textarea
      try {
        console.log("serializer starting");
        var serializer = new XMLSerializer();
        var xml = serializer.serializeToString(doc);
        $("#kml-reduced").val(xml);
      } catch(e) { console.error(e); }

      /*
      // For larger data sets this will run too long...
      setTimeout(function() {
        var time = new Date();
        console.log("plotting");
        // draw the coordinates before and after magnitudes
        Graph.plot(reducedCoordinates, originalCoordinates,  "#00aaff", "#ffaa00");
        console.log("plotted in: " + ((new Date().getTime()) - time.getTime()));
      }, 1000);
      */
      $("#progress").fadeOut(2000, function() { $("#kml-uploader").show(); });
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
  $("#progress").show();
  $("#display").show();
  $("#display").css({visibility:'visible'});
  $("#progress").progressbar({value:0});
  $("#kml-uploader").hide();
  Map.clear();

//  try {
    reduceKMLPoints(tolerance, kml);
//  } catch(e) {
//    console.error(e);
//    alert("Error while trying to parse that file. Make sure it's a valid KML file");
//  }
}

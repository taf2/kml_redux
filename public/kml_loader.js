function reducePointsForCoordinate(coordinate) {
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

function reduceCoordinateSet(doc,coordinate,count, totalCoordinates, cb) {
  var points = reducePointsForCoordinate(coordinate);
  var worker = new Worker("/douglas_peucker_worker.js?cc=" + (new Date()).getTime());

  worker.onmessage = function(event) {
    var percentOfTotal = (event.data.progress* (count/totalCoordinates));
    if ($("#progress").progressbar("value") < percentOfTotal) {
      $("#progress").progressbar({value:percentOfTotal});
    }

    if (event.data.status == 'done') {
      //console.log(points.length + " -> " + event.data.total + " <= " + totalCoordinates );
      updateCoordinateText(doc,coordinate,event.data.points);
      cb(coordinate,event.data.points,points);
    }
  }
  worker.onerror = function(error) {
    console.error(error.message);
  }

  worker.postMessage({points:points,tolerance:0.1});
}

function reduceKMLPoints(kml) {
  var parser = new DOMParser();  
  var doc = parser.parseFromString(kml, "text/xml");
  var coordinates = doc.getElementsByTagName("coordinates");
  var count = 0;

  // build array to compare against for graph
  var originalCoordinates = [];
  var reducedCoordinates = [];

  var iteration = function(coordinate, points, original_points) {
    if (points) { Map.plotPath(points); reducedCoordinates.push(points); } // plot to google maps
    if (original_points) { originalCoordinates.push(original_points); }

    if (count < coordinates.length) {
      reduceCoordinateSet(doc, coordinates[count], count, coordinates.length, iteration);
    }
    else {
      // done
      $("#progress").progressbar({value:100});
      // save document to textarea
      try {
        var serializer = new XMLSerializer();
        var xml = serializer.serializeToString(doc);
        $("#kml-reduced").val(xml);
      } catch(e) { console.error(e); }
      // draw the coordinates before and after magnitudes
      Graph.plot(reducedCoordinates, originalCoordinates,  "#00aaff", "#ffaa00");
    }
    ++count;
  }
  iteration();

  return doc;
}

function KMLloaded(kml) {
  $("#progress").show();
  $("#display").show();
  $("#progress").progressbar({value:0});
  $("#kml-uploader").hide();

  reduceKMLPoints(kml);
}

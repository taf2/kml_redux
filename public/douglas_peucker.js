// from http://www.fonant.com/demos/douglas_peucker/algorithm

function DP() {};

DP.PolylineReducer = function(geopoints_array) {
  var pts = [];
  for (var i = 0, len = geopoints_array.length; i < len; ++i) {
    var point = geopoints_array[i];
    pts.push(new DP.Vector(point.latitude, point.longitude, point.altitude));
  }
  // include first and last points
  pts[0].include = true;
  pts[pts.length-1].include = true;
  this.original_points = pts;
}

DP.PolylineReducer.prototype = {
  /*
   * Returns a list of GeoPoints for the simplest polyline that leaves
   * no original point more than $tolerance away from it.
   *
   * @param float  $tolerance
   * @return DP.GeoPoint array
   */
  simpler_line: function(tolerance) {
    this.tolerance = tolerance;
    this.tolerance_squared = tolerance * tolerance;
    this.douglas_peucker(0,this.original_points.length-1);
    var out = [];
    for (var i = 0, len = this.original_points.length; i < len; ++i) {
      var point = this.original_points[i];
      if (point.include) {
        out.push(new DP.GeoPoint(point.x,point.y,point.z));
      }
    }
    return out;
  },
  /*
   * Douglas-Peuker polyline simplification algorithm. First draws single line
   * from start to end. Then finds largest deviation from this straight line, and if
   * greater than tolerance, includes that point, splitting the original line into
   * two new lines. Repeats recursively for each new line created.
   *
   * @param int $start_vertex_index
   * @param int $end_vertex_index
   */
  douglas_peucker: function(start_vertex_index, end_vertex_index) {
    if (end_vertex_index < (start_vertex_index+1)) { // there is nothing to simplify
      return;
    }

    // make line from start to end
    var line = new DP.Line(this.original_points[start_vertex_index], this.original_points[end_vertex_index]);

    //  Find largest distance from intermediate points to this line
    var max_dist_to_line_squared = 0;
    var max_dist_index = 0;

    for (var index = start_vertex_index+1; index < end_vertex_index; ++index) {
      var dist_to_line_squared = line.distance_to_point_squared(this.original_points[index]);

      if (dist_to_line_squared > max_dist_to_line_squared) {
        max_dist_to_line_squared = dist_to_line_squared;
        max_dist_index = index;
      }

      // Check max distance with tolerance
      if (max_dist_to_line_squared > this.tolerance_squared) { // error is worse than the tolerance
        // split the polyline at the farthest vertex from S
        this.original_points[max_dist_index].include = true;
        // recursively simplify the two subpolylines
        this.douglas_peucker(start_vertex_index, max_dist_index);
        this.douglas_peucker(max_dist_index, end_vertex_index);
      }
      // else the approximation is OK, so ignore intermediate vertices

    }

  }
};

DP.Vector = function(x,y,z) {
  this.x = x;
  this.y = y;
  this.z = z; // XXX: unused in calculation
}
DP.Vector.prototype = {
  dot_product: function(v) {
    return ((this.x * v.x) + (this.y * v.y));
  },
  magnitude: function() {
    return Math.sqrt((this.x*this.x) + (this.y*this.y));
  },
  unit_vector: function() {
    if (this.magnitude() == 0) return new DP.Vector(0,0,0);
    return new DP.Vector(this.x/this.magnitude(), this.y/this.magnitude());
  }
};

DP.Line = function(p1, p2) {
  this.p1 = p1;
  this.p2 = p2;
}

DP.Line.prototype = {
  length_squared: function() {
    var dx = this.p1.x - this.p2.x;
    var dy = this.p1.y - this.p2.y;
    return (dx*dx) + (dy*dy);
  },
  distance_to_point_squared: function(point) {
    var v = new DP.Vector(point.x - this.p1.x, point.y - this.p1.y);
    var l = new DP.Vector(this.p2.x - this.p1.x, this.p2.y - this.p1.y);
    var dot = v.dot_product(l.unit_vector());

    if (dot <= 0) {
      var dl = new DP.Line(this.p1,point);
      return dl.length_squared();
    }

    if ((dot*dot) >= this.length_squared()) {
      var dl = new DP.Line(this.p2, point);
      return dl.length_squared();
    }
    else {
      var v2 = new DP.Line(this.p1,point);
      var h = v2.length_squared();
      return h - (dot*dot);
    }
  }
};

DP.GeoPoint = function(lat,lng,alt) {
  this.latitude = lat;
  this.longitude = lng;
  this.altitude = alt;
}

// main entry point
DP.reduce = function(threshold, points) {
  var reducer = new DP.PolylineReducer(points);
  return reducer.simpler_line(threshold);
}

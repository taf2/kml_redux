importScripts("/douglas_peucker.js");

onmessage = function(event) {  
  var tolerance = event.data.tolerance;
  var points = event.data.points;
  var grouping = [];
  var progress = 0;
  var results = [];
  var total = 0;

  for (var i = 0, len = points.length; i < len; ++i) {
    grouping.push(points[i]);
    if (grouping.length > 10) {  // process in groups of 10
      var less = DP.reduce(tolerance,grouping);
      postMessage({progress:((i/len)*100)});
      if (less && less.length > 0) { results = results.concat(less); total += less.length; } 
      grouping = [];
    }
  }

  if (grouping.length > 0) {
    var less = DP.reduce(tolerance,grouping);
    if (less && less.length) { results = results.concat(less); } 
  }
  // send the final message
  var pruned = [];
  for (var i = 0, len = results.length; i < len; ++i) {
    if (results[i]) { pruned.push(results[i]); }
  }
  postMessage({points:pruned,progress:100,total:total,status:'done'});
};


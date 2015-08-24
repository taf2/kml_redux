# KML Google Maps Simplifier

A fork of https://github.com/taf2/kml_redux, cleaned up + debranded for generic use with a slant towards getting file sizes down, as well as reducing complexity.

This is a small application using primarily Javascript to reduce the polygon count in your KML files.

It uses the Douglas-Peucker algorithm.  From Wikipedia the algorithm is described:

The Douglas–Peucker algorithm is an algorithm for reducing the number of points in a curve that is approximated by a series of points. The initial form of the algorithm was independently suggested in 1972 by Urs Ramer and 1973 by David Douglas and Thomas Peucker. (See the References for more details.) This algorithm is also known under the following names: the Ramer–Douglas–Peucker algorithm, the iterative end-point fit algorithm or the split-and-merge algorithm.

# Running this application (Ruby 2.0, OSX)

```bundle install
ruby app.rb```
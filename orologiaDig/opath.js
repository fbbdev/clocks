'use strict';

(function (exports) {
  function array_extend(array, other) {
    for (let el of other)
      array.push(el);

    return array;
  }
  
  function array_transform(array, fn) {
    let len = array.length;
    for (let i = 0; i < len; ++i)
      array[i] = fn(array[i], i, array);

    return array;
  }

  function opath_centroid(commands) {
    let [x, y, count] = commands.reduce((acc, cmd) => {
      if (cmd.type !== 'Z') {
        acc[0] += cmd.x;
        acc[1] += cmd.y;
        acc[2] += 1;
      }
  
      return acc;
    }, [0, 0, 0]);
  
    return [x/count, y/count];
  }

  const helper = new opentype.Path();

  function opath_bbox(commands) {
    helper.commands = commands;
    return helper.getBoundingBox();
  }
  
  function opath_data(commands) {
    helper.commands = commands;
    return helper.toPathData();
  }

  function opath_bbox_area(bbox) {
    return Math.abs((bbox.x2 - bbox.x1)*(bbox.y2 - bbox.y1));
  }

  function opath_split(opath) {
    // split into parts
    let [parts, last] = opath.commands.reduce(([parts, start], cmd, i) => {
      if (cmd.type === 'Z' && start === i) {
        // Ignore excess Z commands
        start += 1;
      } else if (cmd.type === 'Z' || (cmd.type === 'M' && i > start)) {
        // On Z, or M after start, split new part
        let end = i + ((cmd.type === 'M') ? 0 : 1);
        
        // Ignore isolated M commands
        if (end - start > 1 || opath.commands[start].type !== 'M')
          parts.push(opath.commands.slice(start, end));

        start = end;
      }

      return [parts, start];
    }, [[], 0]);
    
    if (last < opath.commands.length)
      parts.push(opath.commands.slice(last));
 
    parts.forEach(part => {
      part.bbox = opath_bbox(part);
      part.centroid = opath_centroid(part);
      part.holes = [];
    });

    // sort parts by area descending
    parts.sort((p1, p2) => opath_bbox_area(p2.bbox) - opath_bbox_area(p1.bbox));

    // decides whether bbox `b` contains bbox `c`
    const contains = (b, c) => (b.x1 < c.x1 && c.x2 < b.x2) && (b.y1 < c.y1 && c.y2 < b.y2);

    // extract holes
    for (var j = 0; j < parts.length; j++) {
      const potential_hole = parts[j];
      const solid = parts.find(solid => solid && contains(solid.bbox, potential_hole.bbox) && !solid.holes.some(hole => contains(hole.bbox, potential_hole.bbox)));
      if (solid) {
        solid.holes.push(potential_hole);
        parts[j] = null;
      }
    }
    parts = parts.filter(solid => solid);

    // Sort holes by y ascending, x ascending
    parts.forEach(p => p.holes.sort((h1, h2) => {
      let diff = h1.centroid[1] - h2.centroid[1];
      return (diff !== 0) ? diff : h1.centroid[0] - h2.centroid[0];
    }));

    // sort parts by number of holes descending, area descending
    parts.sort((p1, p2) => {
      let diff = p2.holes.length - p1.holes.length;
      return (diff !== 0) ? diff : opath_bbox_area(p2.bbox) - opath_bbox_area(p1.bbox);
    });

    return parts;
  }

  const interpolatorOptions = { maxSegmentLength: 4, single: true };

  function opath_interpolate(from, to) {
    let fromParts = opath_split(from);
    let toParts = opath_split(to);

    let mapFrom = [];
    let mapTo = [];

    let pairCount = Math.max(fromParts.length, toParts.length);
    for (let i = 0; i < pairCount; ++i) {
      mapFrom.push(fromParts[i] ? opath_data(fromParts[i]) : `M${toParts[i].centroid[0]},${toParts[i].centroid[1]}Z`);
      mapTo.push(toParts[i] ? opath_data(toParts[i]) : `M${fromParts[i].centroid[0]},${fromParts[i].centroid[1]}Z`);
      
      let fromHoles = fromParts[i] ? fromParts[i].holes : [];
      let toHoles = toParts[i] ? toParts[i].holes : [];
      let holePairs = Math.max(fromHoles.length, toHoles.length);
      
      for (let i = 0; i < holePairs; ++i) {
        mapFrom.push(fromHoles[i] ? opath_data(fromHoles[i]) : `M${toHoles[i].centroid[0]},${toHoles[i].centroid[1]}Z`);
        mapTo.push(toHoles[i] ? opath_data(toHoles[i]) : `M${fromHoles[i].centroid[0]},${fromHoles[i].centroid[1]}Z`);
      }
    }

    return (mapFrom.length > 0) ? flubber.interpolateAll(mapFrom, mapTo, interpolatorOptions) : () => "";
  }
  exports.opath_interpolate = opath_interpolate;
}(window));

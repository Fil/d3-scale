import {format} from "d3-format";
import nice from "./nice";
import {linearish} from "./linear";
import {copy, transformer} from "./continuous";
import {initRange} from "./init";

function transformSymlog(c) {
  return function(x) {
    return Math.sign(x) * Math.log1p(Math.abs(x / c));
  };
}

function transformSymexp(c) {
  return function(x) {
    return Math.sign(x) * Math.expm1(Math.abs(x)) * c;
  };
}

export function symlogish(transform) {
  var c = 1, forward = transformSymlog(c), invert = transformSymexp(c),
    scale = linearish(transform(forward, invert));

  function rescale() {
    transform(forward = transformSymlog(c), invert = transformSymexp(c));
    return scale;
  }

  scale.constant = function(_) {
    return arguments.length ? (c = +_, rescale()) : c;
  };

  function roundexp2_5(v) {
    if (v == 0) return 0;
    var r = v < 0;
    if (r) v= -v;
    var s = invert(v),
        a = Math.log10(s),
        a2 = Math.log10(s / 2),
        a5 = Math.log10(s / 5),
        b = -100 + Math.floor(100 + a),
        b2 = -100 + Math.floor(100 + a2),
        b5 = -100 + Math.floor(100 + a5),
        c =  Math.pow(10, b);
    if (b5 === b) c *= 5;
    else if (b2 === b) c *= 2;
    return r ? -c : c;
  }

  scale.ticks = function(count) {
    var d = scale.domain(),
        u = d[0],
        v = d[d.length - 1],
        r;

    if (isNaN(n) || n <= 0 || n === Infinity) return [];

    if (r = v < u) i = u, u = v, v = i;

    var i = forward(u),
        j = forward(v),
        n = count == null ? 10 : +count,
        z, zN = [], zP = [], m, s0, rs, rv, s;

    var step = (j-i) / n;

    // negatives
    if (i < 0) {
      m = Math.min(0, j);
      s0 = -Infinity;
      for (s = i; s < m; s += step) {
        rs = roundexp2_5(s);
        rv = forward(rs);
        if (rv - s0 >= step && rv <= -step) {
          zN.push(rs);
          s0 = rv;
        }
      }
    }

    // 0
    if (i * j <= 0 && n) zN.push(0);

    // positives
    if (j > 0) {
      m = Math.max(0, i);
      s0 = +Infinity;
      for (s = j; s > m; s -= step) {
        rs = roundexp2_5(s);
        rv = forward(rs);
        if (rv - s0 <= -step && rv >= step) {
          zP.unshift(rs);
          s0 = rv;
        }
      }
    }

    z = [...zN, ...zP];
    return r ? z.reverse() : z;
  };

  scale.tickFormat = function(count, specifier) {
    if (specifier === undefined) specifier = "~g";
    if (typeof specifier !== "function") specifier = format(specifier);
    return specifier;
  };

  scale.nice = function() {
    return scale.domain(nice(scale.domain(), {
      floor: function(x) { return roundexp2_5(forward(x)); },
      ceil: function(x) { return roundexp2_5(forward(x)); }
    }));
  };

  return scale;
}

export default function symlog() {
  var scale = symlogish(transformer());

  scale.copy = function() {
    return copy(scale, symlog()).constant(scale.constant());
  };

  return initRange.apply(scale, arguments);
}

var math = {
    limit: function (n, lmt) {
        // if n out of range, expand range
        if (typeof lmt[1] == 'undefined' || n > lmt[1]) {
            lmt[1] = n;
        } else if (typeof lmt[0] == 'undefined' || n < lmt[0]) {
            lmt[0] = n;
        }
    },
    average: function (n, avg) {
        avg[0] = avg[0] + (n - avg[0]) / (++avg[1]);
    },
    polysum: function (K, A) { // [ k0, k1, ..., kn ], [ [A0], ... ]
        var out = [],
            n = Math.min(K.length, A.length),
            m = A[0].length;
        for (var i = 0; i < m; i++) {
            out[i] = 0;
            for (var ii = 0; ii < n; ii++) {
                out[i] += K[ii] * A[ii][i];
            }
        }
        return out;
    },
    fit: function (n, c) { // c : array of ctrl points; n : num of interpolating
        let out = [];
        for (let i = 0; i <= n; i++) {
            let ubase = i / n;
            let u = [1];
            let d = [0]; // dp/du
            let dd = [0, 0, 2, 6 * ubase]; // d2p/du2
            for (let j = 1, l = c.length; j < l; j++) {
                u[j] = u[j - 1] * ubase;
                d[j] = u[j - 1] * j;
            }
            out[i] = [this.polysum(u, c), this.polysum(d, c), this.polysum(dd, c)];
        }
        return out;
    },
    cubeFit4parts: function (n, p0, p1, p2, p3) { // 0, 0.25, 0.75, 1
        let mat = [1, -6.33, 10.67, -5.33, 0, 8, -18.67, 10.67, 0, -2.67, 13.33, -10.67, 0, 1, -5.33, 5.33];
        let c = mat4.x4points(mat, p0, p1, p2, p3);
        return this.fit(n, c);
    },
    hermiteFit: function (n, p0, p3, dp0, dp3) {
        let mat = [1, 0, -3, 2, 0, 0, 3, -2, 0, 1, -2, 1, 0, 0, -1, 1];
        let c = mat4.x4points(mat, p0, p3, dp0, dp3);
        return this.fit(n, c);
    },
    lineFit: function (n, p0, p1) {
        let c = [p0, vec3.point(p0, p1)];
        return this.fit(n, c);
    },
    quadFit: function (n, p0, p1, p2) { // 0, 0.5, 1
        let mat = [1, -3, 2, 0, 4, -4, 0, -1, 2];
        let c = mat3.x3points(mat, p0, p1, p2);
        return this.fit(n, c);
    },
}

var mat3 = {
    x: function (A, B) {
        let M = [];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                M[i + 3 * j] = A[i] * B[3 * j] + A[i + 3] * B[3 * j + 1] + A[i + 6] * B[3 * j + 2];
            }
        }
        return M;
    },
    x3points: function (M, p0, p1, p2) {
        // mat33 x mat33
        let P = [p0[0], p1[0], p2[0], p0[1], p1[1], p2[1], p0[2], p1[2], p2[2]];
        let C = this.x(M, P);
        return [[C[0], C[3], C[6]], [C[1], C[4], C[7]], [C[2], C[5], C[8]]];
    }
}

var mat4 = {
    x: function (A, B) {
        let M = [];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                M[i + 4 * j] = A[i] * B[4 * j] + A[i + 4] * B[4 * j + 1] + A[i + 8] * B[4 * j + 2] + A[i + 12] * B[4 * j + 3];
            }
        }
        return M;
    },
    x4points: function (M, p0, p1, p2, p3) {
        // mat44 x mat 43
        let P = [p0[0], p1[0], p2[0], p3[0], p0[1], p1[1], p2[1], p3[1], p0[2], p1[2], p2[2], p3[2], 0, 0, 0, 0];
        let C = this.x(M, P);
        return [[C[0], C[4], C[8]], [C[1], C[5], C[9]], [C[2], C[6], C[10]], [C[3], C[7], C[11]]];
    },

}

var vec3 = {
    init: function () {
        return [0, 0, 0];
    },
    negate: function (A) {
        return [-A[0], -A[1], -A[2]];
    },
    plus: function (A, B) {
        return [A[0] + B[0], A[1] + B[1], A[2] + B[2]];
    },
    minus: function (A, B) {
        return [A[0] - B[0], A[1] - B[1], A[2] - B[2]];
    },
    point: function (A, B) {
        return vec3.minus(B, A);
    },
    scalar: function (k, A) {
        return [k * A[0], k * A[1], k * A[2]];
    },
    dot: function (A, B) {
        return A[0] * B[0] + A[1] * B[1] + A[2] * B[2];
    },
    cross: function (A, B) {
        return [A[1] * B[2] - A[2] * B[1], A[2] * B[0] - A[0] * B[2], A[0] * B[1] - A[1] * B[0]];
    },
    x: function (A, B) {
        return [A[0] * B[0], A[1] * B[1], A[2] * B[2]];
    },
    len: function (A) {
        return Math.sqrt(A[0] * A[0] + A[1] * A[1] + A[2] * A[2]);
    },
    setlen: function (len, A) {
        return this.scalar(len, this.unit(A));
    },
    dist: function (A, B) {
        return this.len(this.minus(A, B));
    },
    mid: function (A, B) {
        return this.scalar(0.5, this.plus(A, B));
    },
    average: function (Vs) {
        var x = y = z = 0, len = Vs.length;
        if (len) {
            Vs.forEach(function (V) {
                x += V[0];
                y += V[1];
                z += V[2];
            });
            return [x / len, y / len, z / len];
        } else {
            return null;
        }
    },
    cos: function (A, B, unitized) {
        return unitized ? this.dot(A, B) : (this.dot(A, B) / this.len(A) / this.len(B));
    },
    rad: function (A, B, unitized) {
        var cos_AB = unitized ? this.dot(A, B) : (this.dot(A, B) / this.len(A) / this.len(B));
        return Math.acos(math.clamp(cos_AB, [-1, 1]));
    },
    unit: function (A) {
        var len = this.len(A);
        return len > Number.EPSILON ? this.scalar(1 / len, A) : [0, 0, 0];
    },
    step: function (t, A, B) {
        return this.plus(this.scalar(1 - t, A), this.scalar(t, B));
    }
}
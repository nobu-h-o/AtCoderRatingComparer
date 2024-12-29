//このファイルは https://img.atcoder.jp/public/22afd08/js/rating-graph.js を元にしています

var rating_history1;
var rating_history2;

var MARGIN_VAL_X = 86400 * 30;
var MARGIN_VAL_Y_LOW = 100;
var MARGIN_VAL_Y_HIGH = 300;
var OFFSET_X = 50;
var OFFSET_Y = 5;
var DEFAULT_WIDTH = 640;
var canvas_status = document.getElementById("ratingStatus");
var STATUS_WIDTH = canvas_status.width - OFFSET_X - 10;
var STATUS_HEIGHT = canvas_status.height - OFFSET_Y - 5;
var canvas_graph = document.getElementById("ratingGraph");
var PANEL_WIDTH = canvas_graph.width - OFFSET_X - 10;
var PANEL_HEIGHT = canvas_graph.height - OFFSET_Y - 30;
var HIGHEST_WIDTH = 80;
var HIGHEST_HEIGHT = 20;
var LABEL_FONT = "12px Lato";
var START_YEAR = 2010;
var MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var YEAR_SEC = 86400 * 365;
var STEP_SIZE = 400;
var COLORS = [
    [0, "#808080", 0.15],
    [400, "#804000", 0.15],
    [800, "#008000", 0.15],
    [1200, "#00C0C0", 0.2],
    [1600, "#0000FF", 0.1],
    [2000, "#C0C000", 0.25],
    [2400, "#FF8000", 0.2],
    [2800, "#FF0000", 0.1]
];
var STAR_MIN = 3200;
var PARTICLE_MIN = 3;
var PARTICLE_MAX = 20;
var LIFE_MAX = 30;
var EPS = 1e-9;
var cj = createjs;
var stage_graph, stage_status;
// Shapes / containers for the chart
var panel_shape, border_shape;
var chart_container, line_shape1, line_shape2, vertex_shapes1, vertex_shapes2;
var highest_shape1, highest_shape2;
var x_min, x_max, y_min, y_max;
// Status
var border_status_shape;
var rating_text, place_text, diff_text, date_text, contest_name_text;
var particles;
var standings_url;

var n1, n2;
function initStage(stage, canvas) {
    var width = canvas.getAttribute('width');
    var height = canvas.getAttribute('height');
    if (window.devicePixelRatio) {
        canvas.setAttribute('width', Math.round(width * window.devicePixelRatio));
        canvas.setAttribute('height', Math.round(height * window.devicePixelRatio));
        stage.scaleX = stage.scaleY = window.devicePixelRatio;
    }
    canvas.style.maxWidth = width + "px";
    canvas.style.maxHeight = height + "px";
    canvas.style.width = canvas.style.height = "100%";
    stage.enableMouseOver();
}
function newShape(parent) {
    var s = new cj.Shape();
    parent.addChild(s);
    return s;
}
function newText(parent, x, y, font) {
    var t = new cj.Text("", font, "#000");
    t.x = x;
    t.y = y;
    t.textAlign = "center";
    t.textBaseline = "middle";
    parent.addChild(t);
    return t;
}
export function init(data1, data2) {
    rating_history1 = data1;
    rating_history2 = data2;
    n1 = rating_history1.length;
    n2 = rating_history2.length;

    // If you have no data at all, just exit:
    if (n1 === 0 && n2 === 0)
        return;
    stage_graph = new cj.Stage("ratingGraph");
    stage_status = new cj.Stage("ratingStatus");
    initStage(stage_graph, canvas_graph);
    initStage(stage_status, canvas_status);
    // Figure out the global x_min, x_max, y_min, y_max
    // based on both rating_history1 and rating_history2
    x_min = Infinity;
    x_max = -Infinity;
    y_min = Infinity;
    y_max = -Infinity;
    // Helper function to incorporate a rating array's min / max:
    function updateBounds(rating_history) {
        for (var i = 0; i < rating_history.length; i++) {
            x_min = Math.min(x_min, rating_history[i].EndTime);
            x_max = Math.max(x_max, rating_history[i].EndTime);
            y_min = Math.min(y_min, rating_history[i].NewRating);
            y_max = Math.max(y_max, rating_history[i].NewRating);
        }
    }
    // Update the bounds from both data sets
    updateBounds(rating_history1);
    updateBounds(rating_history2);
    // Expand bounds to give some margin
    x_min -= MARGIN_VAL_X;
    x_max += MARGIN_VAL_X;
    y_min = Math.min(1500, Math.max(0, y_min - MARGIN_VAL_Y_LOW));
    y_max += MARGIN_VAL_Y_HIGH;
    initBackground();
    initChart();
    stage_graph.update();
    initStatus();
    stage_status.update();
    cj.Ticker.setFPS(60);
    cj.Ticker.addEventListener("tick", handleTick);
    function handleTick(event) {
        updateParticles();
        stage_status.update();
    }
}
function getPer(x, l, r) {
    return (x - l) / (r - l);
}
function getColor(x) {
    for (var i = COLORS.length - 1; i >= 0; i--) {
        if (x >= COLORS[i][0])
            return COLORS[i];
    }
    return [-1, "#000000", 0.1];
}
function initBackground() {
    panel_shape = newShape(stage_graph);
    panel_shape.x = OFFSET_X;
    panel_shape.y = OFFSET_Y;
    panel_shape.alpha = 0.3;
    border_shape = newShape(stage_graph);
    border_shape.x = OFFSET_X;
    border_shape.y = OFFSET_Y;
    function newLabelY(s, y) {
        var t = new cj.Text(s, LABEL_FONT, "#000");
        t.x = OFFSET_X - 10;
        t.y = OFFSET_Y + y;
        t.textAlign = "right";
        t.textBaseline = "middle";
        stage_graph.addChild(t);
    }
    function newLabelX(s, x, y) {
        var t = new cj.Text(s, LABEL_FONT, "#000");
        t.x = OFFSET_X + x;
        t.y = OFFSET_Y + PANEL_HEIGHT + 2 + y;
        t.textAlign = "center";
        t.textBaseline = "top";
        stage_graph.addChild(t);
    }
    var y1 = 0;
    for (var i = COLORS.length - 1; i >= 0; i--) {
        var y2 = PANEL_HEIGHT - PANEL_HEIGHT * getPer(COLORS[i][0], y_min, y_max);
        if (y2 > 0 && y1 < PANEL_HEIGHT) {
            y1 = Math.max(y1, 0);
            panel_shape.graphics.f(COLORS[i][1]).r(0, y1, PANEL_WIDTH, Math.min(y2, PANEL_HEIGHT) - y1);
        }
        y1 = y2;
    }
    for (var i = 0; i <= y_max; i += STEP_SIZE) {
        if (i >= y_min) {
            var y = PANEL_HEIGHT - PANEL_HEIGHT * getPer(i, y_min, y_max);
            newLabelY(String(i), y);
            border_shape.graphics.s("#FFF").ss(0.5);
            if (i == 2000)
                border_shape.graphics.s("#000");
            border_shape.graphics.mt(0, y).lt(PANEL_WIDTH, y);
        }
    }
    border_shape.graphics.s("#FFF").ss(0.5);
    var month_step = 6;
    for (var i = 3; i >= 1; i--) {
        if (x_max - x_min <= YEAR_SEC * i + MARGIN_VAL_X * 2)
            month_step = i;
    }
    var first_flag = true;
    for (var year = START_YEAR; year < 3000; year++) {
        var break_flag = false;
        for (var j = 0; j < 12; j += month_step) {
            var month = ('00' + (j + 1)).slice(-2);
            var unix = Date.parse(String(year) + "-" + month + "-01T00:00:00") / 1000;
            if (x_min < unix && unix < x_max) {
                var x = PANEL_WIDTH * getPer(unix, x_min, x_max);
                if (j == 0 || first_flag) {
                    newLabelX(MONTH_NAMES[j], x, 0);
                    newLabelX(String(year), x, 13);
                    first_flag = false;
                }
                else {
                    newLabelX(MONTH_NAMES[j], x, 0);
                }
                border_shape.graphics.mt(x, 0).lt(x, PANEL_HEIGHT);
            }
            if (unix > x_max) {
                break_flag = true;
                break;
            }
        }
        if (break_flag)
            break;
    }
    border_shape.graphics.s("#888").ss(1.5).rr(0, 0, PANEL_WIDTH, PANEL_HEIGHT, 2);
}
function initChart() {
    chart_container = new cj.Container();
    stage_graph.addChild(chart_container);
    chart_container.shadow = new cj.Shadow("rgba(0,0,0,0.3)", 1, 2, 3);
    line_shape1 = newShape(chart_container);
    highest_shape1 = newShape(chart_container);
    vertex_shapes1 = [];
    line_shape2 = newShape(chart_container);
    highest_shape2 = newShape(chart_container);
    vertex_shapes2 = [];
    function mouseoverVertex1(e) {
        vertex_shapes1[e.target.i].scaleX = vertex_shapes1[e.target.i].scaleY = 1.2;
        stage_graph.update();
        setStatus(rating_history1[e.target.i], true);
    }
    function mouseoutVertex1(e) {
        vertex_shapes1[e.target.i].scaleX = vertex_shapes1[e.target.i].scaleY = 1;
        stage_graph.update();
    }
    function mouseoverVertex2(e) {
        vertex_shapes2[e.target.i].scaleX = vertex_shapes2[e.target.i].scaleY = 1.2;
        stage_graph.update();
        setStatus(rating_history2[e.target.i], true);
    }
    function mouseoutVertex2(e) {
        vertex_shapes2[e.target.i].scaleX = vertex_shapes2[e.target.i].scaleY = 1;
        stage_graph.update();
    }
    var highest_i1 = 0;
    for (var i = 0; i < n1; i++) {
        if (rating_history1[highest_i1].NewRating < rating_history1[i].NewRating) {
            highest_i1 = i;
        }
    }
    var highest_i2 = 0;
    for (var i = 0; i < n2; i++) {
        if (rating_history2[highest_i2].NewRating < rating_history2[i].NewRating) {
            highest_i2 = i;
        }
    }
    // Create vertices for dataset 1
    for (var i = 0; i < n1; i++) {
        vertex_shapes1.push(newShape(chart_container));
        vertex_shapes1[i].graphics.s("#FFF");
        if (i == highest_i1)
            vertex_shapes1[i].graphics.s("#000");
        vertex_shapes1[i].graphics
            .ss(0.5)
            .f(getColor(rating_history1[i].NewRating)[1])
            .dc(0, 0, 3.5);
        vertex_shapes1[i].x = OFFSET_X + PANEL_WIDTH * getPer(rating_history1[i].EndTime, x_min, x_max);
        vertex_shapes1[i].y = OFFSET_Y + (PANEL_HEIGHT - PANEL_HEIGHT * getPer(rating_history1[i].NewRating, y_min, y_max));
        vertex_shapes1[i].i = i;
        var hitArea1 = new cj.Shape();
        hitArea1.graphics.f("#000").dc(1.5, 1.5, 6);
        vertex_shapes1[i].hitArea = hitArea1;
        vertex_shapes1[i].addEventListener("mouseover", mouseoverVertex1);
        vertex_shapes1[i].addEventListener("mouseout", mouseoutVertex1);
    }
    // Create vertices for dataset 2
    for (var i = 0; i < n2; i++) {
        vertex_shapes2.push(newShape(chart_container));
        // We'll give them a slight different "stroke" color to differentiate
        vertex_shapes2[i].graphics.s("#FFF");
        if (i == highest_i2)
            vertex_shapes2[i].graphics.s("#000");
        vertex_shapes2[i].graphics
            .ss(0.5)
            .f(getColor(rating_history2[i].NewRating)[1])
            .dc(0, 0, 3.5);
        vertex_shapes2[i].x = OFFSET_X + PANEL_WIDTH * getPer(rating_history2[i].EndTime, x_min, x_max);
        vertex_shapes2[i].y = OFFSET_Y + (PANEL_HEIGHT - PANEL_HEIGHT * getPer(rating_history2[i].NewRating, y_min, y_max));
        vertex_shapes2[i].i = i;
        var hitArea2 = new cj.Shape();
        hitArea2.graphics.f("#000").dc(1.5, 1.5, 6);
        vertex_shapes2[i].hitArea = hitArea2;
        vertex_shapes2[i].addEventListener("mouseover", mouseoverVertex2);
        vertex_shapes2[i].addEventListener("mouseout", mouseoutVertex2);
    }
    if (n1 > 0) {
        var dx1 = 80;
        if ((x_min + x_max) / 2 < rating_history1[highest_i1].EndTime)
            dx1 = -80;
        var x1 = vertex_shapes1[highest_i1].x + dx1;
        var y1 = vertex_shapes1[highest_i1].y - 16;
        highest_shape1.graphics.s("#FFF").mt(vertex_shapes1[highest_i1].x, vertex_shapes1[highest_i1].y).lt(x1, y1);
        highest_shape1.graphics.s("#888").f("#FFF").rr(x1 - HIGHEST_WIDTH / 2, y1 - HIGHEST_HEIGHT / 2, HIGHEST_WIDTH, HIGHEST_HEIGHT, 2);
        highest_shape1.i = highest_i1;
        var highest_text1 = newText(stage_graph, x1, y1, "12px Lato");
        highest_text1.text = "Highest(1): " + rating_history1[highest_i1].NewRating;
        highest_shape1.addEventListener("mouseover", mouseoverVertex1);
        highest_shape1.addEventListener("mouseout", mouseoutVertex1);
    }
    if (n2 > 0) {
        var dx2 = 80;
        if ((x_min + x_max) / 2 < rating_history2[highest_i2].EndTime)
            dx2 = -80;
        var x2 = vertex_shapes2[highest_i2].x + dx2;
        var y2 = vertex_shapes2[highest_i2].y - 16;
        highest_shape2.graphics.s("#FFF").mt(vertex_shapes2[highest_i2].x, vertex_shapes2[highest_i2].y).lt(x2, y2);
        highest_shape2.graphics.s("#888").f("#FFF").rr(x2 - HIGHEST_WIDTH / 2, y2 - HIGHEST_HEIGHT / 2, HIGHEST_WIDTH, HIGHEST_HEIGHT, 2);
        highest_shape2.i = highest_i2;
        var highest_text2 = newText(stage_graph, x2, y2, "12px Lato");
        highest_text2.text = "Highest(2): " + rating_history2[highest_i2].NewRating;
        highest_shape2.addEventListener("mouseover", mouseoverVertex2);
        highest_shape2.addEventListener("mouseout", mouseoutVertex2);
    }
    for (var j = 0; j < 2; j++) {
        if (j == 0)
            line_shape1.graphics.s("#AAA").ss(2);
        else
            line_shape1.graphics.s("#FFF").ss(0.5);
        if (n1 > 0) {
            line_shape1.graphics.mt(vertex_shapes1[0].x, vertex_shapes1[0].y);
            for (var i = 0; i < n1; i++) {
                line_shape1.graphics.lt(vertex_shapes1[i].x, vertex_shapes1[i].y);
            }
        }
    }
    for (var j = 0; j < 2; j++) {
        if (j == 0)
            line_shape2.graphics.s("#AAA").ss(2);
        else
            line_shape2.graphics.s("#FFF").ss(0.5);
        if (n2 > 0) {
            line_shape2.graphics.mt(vertex_shapes2[0].x, vertex_shapes2[0].y);
            for (var i = 0; i < n2; i++) {
                line_shape2.graphics.lt(vertex_shapes2[i].x, vertex_shapes2[i].y);
            }
        }
    }
}
function initStatus() {
    border_status_shape = newShape(stage_status);
    rating_text = newText(stage_status, OFFSET_X + 75, OFFSET_Y + STATUS_HEIGHT / 2, "48px 'Squada One'");
    place_text = newText(stage_status, OFFSET_X + 160, OFFSET_Y + STATUS_HEIGHT / 2.7, "16px Lato");
    diff_text = newText(stage_status, OFFSET_X + 160, OFFSET_Y + STATUS_HEIGHT / 1.5, "11px Lato");
    diff_text.color = '#888';
    date_text = newText(stage_status, OFFSET_X + 200, OFFSET_Y + STATUS_HEIGHT / 4, "14px Lato");
    contest_name_text = newText(stage_status, OFFSET_X + 200, OFFSET_Y + STATUS_HEIGHT / 1.6, "20px Lato");
    date_text.textAlign = contest_name_text.textAlign = "left";
    contest_name_text.maxWidth = STATUS_WIDTH - 200 - 10;
    {
        var hitArea = new cj.Shape();
        hitArea.graphics.f("#000").r(0, -12, contest_name_text.maxWidth, 24);
        contest_name_text.hitArea = hitArea;
        contest_name_text.cursor = "pointer";
        contest_name_text.addEventListener("click", function () {
            location.href = standings_url;
        });
    }
    particles = [];
    for (var i = 0; i < PARTICLE_MAX; i++) {
        particles.push(newText(stage_status, 0, 0, "64px Lato"));
        particles[i].visible = false;
    }
    // By default, let's set the status to the last entry of dataset1 if it exists,
    // or dataset2 if dataset1 is empty.
    if (rating_history1.length > 0) {
        setStatus(rating_history1[rating_history1.length - 1], false);
    }
    else if (rating_history2.length > 0) {
        setStatus(rating_history2[rating_history2.length - 1], false);
    }
}
function getRatingPer(x) {
    var pre = COLORS[COLORS.length - 1][0] + STEP_SIZE;
    for (var i = COLORS.length - 1; i >= 0; i--) {
        if (x >= COLORS[i][0])
            return (x - COLORS[i][0]) / (pre - COLORS[i][0]);
        pre = COLORS[i][0];
    }
    return 0;
}
function getOrdinal(x) {
    var s = ["th", "st", "nd", "rd"], v = x % 100;
    return x + (s[(v - 20) % 10] || s[v] || s[0]);
}
function getDiff(x) {
    var sign = x === 0 ? '' : (x < 0 ? '-' : '+');
    return sign + Math.abs(x);
}
function setStatus(data, particle_flag) {
    var date = new Date(data.EndTime * 1000);
    var rating = data.NewRating, old_rating = data.OldRating;
    var place = data.Place;
    var contest_name = data.ContestName;
    var tmp = getColor(rating);
    var color = tmp[1], alpha = tmp[2];
    border_status_shape.graphics.c().s(color).ss(1).rr(OFFSET_X, OFFSET_Y, STATUS_WIDTH, STATUS_HEIGHT, 2);
    rating_text.text = rating;
    rating_text.color = color;
    place_text.text = getOrdinal(place);
    diff_text.text = getDiff(rating - old_rating);
    date_text.text = date.toLocaleDateString();
    contest_name_text.text = contest_name;
    if (particle_flag) {
        var particle_num = parseInt(Math.pow(getRatingPer(rating), 2) * (PARTICLE_MAX - PARTICLE_MIN) + PARTICLE_MIN);
        setParticles(particle_num, color, alpha, rating);
    }
    standings_url = data.StandingsUrl;
}
function setParticle(particle, x, y, color, alpha, star_flag) {
    particle.x = x;
    particle.y = y;
    var ang = Math.random() * Math.PI * 2;
    var speed = Math.random() * 4 + 4;
    particle.vx = Math.cos(ang) * speed;
    particle.vy = Math.sin(ang) * speed;
    particle.rot_speed = Math.random() * 20 + 10;
    particle.life = LIFE_MAX;
    particle.visible = true;
    particle.color = color;
    if (star_flag) {
        particle.text = "★";
    }
    else {
        particle.text = "@";
    }
    particle.alpha = alpha;
}
function setParticles(num, color, alpha, rating) {
    for (var i = 0; i < PARTICLE_MAX; i++) {
        if (i < num) {
            setParticle(particles[i], rating_text.x, rating_text.y, color, alpha, rating >= STAR_MIN);
        }
        else {
            particles[i].life = 0;
            particles[i].visible = false;
        }
    }
}
function updateParticle(particle) {
    if (particle.life <= 0) {
        particle.visible = false;
        return;
    }
    particle.x += particle.vx;
    particle.vx *= 0.9;
    particle.y += particle.vy;
    particle.vy *= 0.9;
    particle.life--;
    particle.scaleX = particle.scaleY = particle.life / LIFE_MAX;
    particle.rotation += particle.rot_speed;
}
function updateParticles() {
    for (var i = 0; i < PARTICLE_MAX; i++) {
        if (particles[i].life > 0) {
            updateParticle(particles[i]);
        }
    }
}
// Optional: expand button logic
$('#rating-graph-expand').click(function () {
    canvas_status.style.maxWidth = canvas_status.style.maxHeight = "";
    canvas_graph.style.maxWidth = canvas_graph.style.maxHeight = "";
    $(this).css('cssText', 'display: none !important;');
});
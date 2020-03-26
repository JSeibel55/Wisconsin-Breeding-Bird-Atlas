//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){

    //map frame dimensions
    var width = 1000,
        height = 700;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on France
    var projection = d3.geoAlbers()
        .center([0.00, 44.50])
        .rotate([90.00, 0.00, 0])
        .parallels([29.5, 45.5])
        .scale(6000.00)
        .translate([width / 2, height / 2]);

    var path = d3.geoPath()
    .projection(projection);
        
    //use Promise.all to parallelize asynchronous data loading
    var promises = [d3.csv("data/Wisconsin Breeding Bird Atlas.csv"),
                    d3.json("data/WI_Counties.json")
                   ];
    Promise.all(promises).then(callback);

    function callback(data){
        csvData = data[0];
        wisconsin = data[1];

        //translate europe TopoJSON
        var wiCounties = topojson.feature(wisconsin, wisconsin.objects.WI_Counties).features;

        //add Wisconsin counties to map
        var regions = map.selectAll(".counties")
            .data(wiCounties)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "counties " + d.properties.adm1_code;
            })
            .attr("d", path);
    };
};
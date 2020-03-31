//Wrap everything in a self-executing anonymous function to move to local scope
(function(){

    //pseudo-global variables
    //variables for data join
    var attrArray = ["Breeding 2015-2020", "Total Observed 2015-2020", "Effort Hours 2015-2020", "Breeding 1995-2000", 
    "Total Observed 1995-2000", "Change in Breeding", "Change in Total"]; //list of attributes
    var expressed = attrArray[0]; //initial attribute
    
    //begin script when window loads
    window.onload = setMap();
    
    //set up choropleth map
    function setMap(){

        //map frame dimensions
        var width = window.innerWidth * 0.5,
            height = 550;

        //create new svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        //create Albers equal area conic projection centered on France
        var projection = d3.geoAlbers()
            .center([0.00, 44.75])
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

            //join csv data to GeoJSON enumeration units
            wiCounties = joinData(wiCounties, csvData);

            //create the color scale
            var colorScale = makeColorScale(csvData);

            //add enumeration units to the map
            setEnumerationUnits(wiCounties, map, path, colorScale);

            //add coordinated visualization to the map
            setChart(csvData, colorScale);

            console.log(wiCounties);
        };
    }; //End setMap
    
    //loop through csv to assign each set of csv attribute values to geojson region
    function joinData(wiCounties, csvData){
        for (var i=0; i<csvData.length; i++){
            var csvCounty = csvData[i]; //the current region
            var csvKey = csvCounty.County; //the CSV primary key

            //loop through geojson regions to find correct region
            for (var a=0; a<wiCounties.length; a++){

                var geojsonProps = wiCounties[a].properties; //the current region geojson properties
                var geojsonKey = geojsonProps.COUNTY_NAM; //the geojson primary key

                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey){

                    //assign all attributes and values
                    attrArray.forEach(function(attr){
                        var val = parseFloat(csvCounty[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                };
            };
        };
    
        return wiCounties;
    };

    //Add Wisconsin counties to map
    function setEnumerationUnits(wiCounties, map, path, colorScale){
        var regions = map.selectAll(".counties")
            .data(wiCounties)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "counties " + d.properties.adm1_code;
            })
            .attr("d", path)
            .style("fill", function(d){
                var value = d.properties[expressed];
                if(value) {
                    return colorScale(d.properties[expressed]);
                } else {
                    return "#ccc";
                }
        });
    };

    //function to create color scale generator (Natural Breaks)
    function makeColorScale(data){
        var colorClasses = [
            "#d0d1e6",
            "#a6bddb",
            "#74a9cf",
            "#2b8cbe",
            "#045a8d"
        ];

        //create color scale generator
        var colorScale = d3.scaleThreshold()
            .range(colorClasses);
    
        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i=0; i<data.length; i++){
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val);
        };
    
        //cluster data using ckmeans clustering algorithm to create natural breaks
        var clusters = ss.ckmeans(domainArray, 5);
        //reset domain array to cluster minimums
        domainArray = clusters.map(function(d){
            return d3.min(d);
        });
        //remove first value from domain array to create class breakpoints
        domainArray.shift();
    
        //assign array of last 4 cluster minimums as domain
        colorScale.domain(domainArray);
    
        return colorScale;
    };

    //function to create coordinated bar chart
    function setChart(csvData, colorScale){
        //chart frame dimensions
        var chartWidth = window.innerWidth * 0.425,
            chartHeight = 560,
            leftPadding = 25,
            rightPadding = 2,
            topBottomPadding = 5,
            chartInnerWidth = chartWidth - leftPadding - rightPadding,
            chartInnerHeight = chartHeight - topBottomPadding * 2,
            translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

        //create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        //create a rectangle for chart background fill
        var chartBackground = chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        //create a scale to size bars proportionally to frame
        var yScale = d3.scaleLinear()
            .range([(chartHeight-10), 0])
            .domain([0, 200]);

        //set bars for each province
        var bars = chart.selectAll(".bars")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "bars " + d.County;
            })
            .attr("width", chartInnerWidth / csvData.length - 1)
            .attr("x", function(d, i){
                return i * (chartInnerWidth / csvData.length) + leftPadding;
            })
            .attr("height", function(d){
                return (chartHeight-10) - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d){
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            .style("fill", function(d){
                return colorScale(d[expressed]);
            });

        //Create a text element for the chart title
        var chartTitle = chart.append("text")
            .attr("x", 40)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text(setChartTitle(expressed));

        //create vertical axis generator
        var yAxis = d3.axisLeft()
            .scale(yScale);

        //place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);

        //create frame for chart border
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);       
    };

    // Return the correct chart title per the field name
    function setChartTitle(expressed){
        if (expressed === "Breeding 2015-2020"){
            return "Number of Breeding Bird Species: 2015-2020 Atlas"
        }
        else if (expressed === "Total Observed 2015-2020"){
            return "Total Bird Species Observed: 2015-2020 Atlas"
        }
        else if (expressed === "Effort Hours 2015-2020"){
            return "Total Effort Hours: 2015-2020 Atlas"
        }
        else if (expressed === "Breeding 1995-2000"){
            return "Breeding Bird Species: 1995-2000 Atlas"
        }
        else if (expressed === "Total Observed 1995-2000"){
            return "Total Bird Species Observed: 1995-2000 Atlas"
        }
        else if (expressed === "Change in Breeding"){
            return "Change in Number of Breeding Bird Species"
        }
        else if (expressed === "Change in Total"){
            return "Change in Total Bird Species Observed"
        }
    }


})(); //last line of main.js

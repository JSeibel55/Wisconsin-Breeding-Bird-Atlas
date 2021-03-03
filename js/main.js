//Wrap everything in a self-executing anonymous function to move to local scope
(function(){

    //pseudo-global variables
    //variables for data join
    var attrArray = ["Breeding Species: BBA2", "Observed Species: BBA2", "Effort Hours: BBA2", "Breeding Species: BBA1", 
    "Observed Species: BBA1", "Change in Breeding Birds", "Change in Observed Birds"]; //list of attributes
    var expressed = attrArray[0]; //initial attribute

    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.535,
        chartHeight = 560,
        leftPadding = 50,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    //create a scale to size bars proportionally to frame
    var yScale = d3.scaleLinear()
        .range([(chartHeight-10), 0])
        .domain([0, 220]);

    //create vertical axis generator
    var yAxis;
    var axis;
    
    //begin script when window loads
    window.onload = setMap();
    // Adjust for mobile screens
    if ($(window).width() < 600){
        chartWidth = window.innerWidth,
        chartInnerWidth = chartWidth - leftPadding - rightPadding;
    }
    
    //set up choropleth map
    function setMap(){

        //map frame dimensions
        var width = window.innerWidth * 0.4,
            height = 550;

        //create new svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        //create Albers equal area conic projection centered on France
        var projection = d3.geoAlbers()
            .center([0.00, 44.85])
            .rotate([90.00, 0.00, 0])
            .parallels([29.5, 45.5])
            .scale(6000.00)
            .translate([width / 2, height / 2]);

        // Change projection for mobile screens
        if ($(window).width() < 600){
            projection = d3.geoAlbers()
            .center([-1.75, 44.85])
            .rotate([90.00, 0.00, 0])
            .parallels([29.5, 45.5])
            .scale(4000.00)
            .translate([width / 2, height / 2]);
        }

        var path = d3.geoPath()
        .projection(projection);
            
        //use Promise.all to parallelize asynchronous data loading
        var promises = [d3.csv("data/Wisconsin Breeding Bird Atlas.csv"),
                        d3.json("data/US_States.json"),
                        d3.json("data/WI_Counties.json")
                    ];
        Promise.all(promises).then(callback);

        function callback(data){
            csvData = data[0];
            unitedstates = data[1];
            wisconsin = data[2];

            //place graticule on the map
            setGraticule(map, path);

            //translate europe TopoJSON
            var usStates = topojson.feature(unitedstates, unitedstates.objects.US_States),
                wiCounties = topojson.feature(wisconsin, wisconsin.objects.WI_Counties).features;

            //add US states to map
            var states = map.append("path")
                .datum(usStates)
                .attr("class", "states")
                .attr("d", path);
            
            //join csv data to GeoJSON enumeration units
            wiCounties = joinData(wiCounties, csvData);

            //create the color scale
            var colorScale = makeColorScale(csvData);

            //add enumeration units to the map
            setEnumerationUnits(wiCounties, map, path, colorScale);

            //add coordinated visualization to the map
            setChart(csvData, colorScale);

            //add a drop down menu
            createDropdown(csvData);

            createDataInfo();

            //add atlas background info
            createBackgroundInfo();

            
        };
    }; //End setMap

    //Create Graticule
    function setGraticule(map, path){
        //create graticule generator
        var graticule = d3.geoGraticule()
        .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude

        //create graticule background
        var gratBackground = map.append("path")
            .datum(graticule.outline()) //bind graticule background
            .attr("class", "gratBackground") //assign class for styling
            .attr("d", path) //project graticule

        //create graticule lines
        var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
            .data(graticule.lines()) //bind graticule lines to each element to be created
            .enter() //create an element for each datum
            .append("path") //append each element to the svg as a path element
            .attr("class", "gratLines") //assign class for styling
            .attr("d", path); //project graticule lines

        //Create graticule lines
        var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
    };
    
    //loop through csv to assign each set of csv attribute values to geojson region
    function joinData(wiCounties, csvData){
        for (var i=0; i<csvData.length; i++){
            var csvCounty = csvData[i]; //the current region
            var csvKey = csvCounty.COUNTY_ID; //the CSV primary key

            //loop through geojson regions to find correct region
            for (var a=0; a<wiCounties.length; a++){

                var geojsonProps = wiCounties[a].properties; //the current region geojson properties
                var geojsonKey = geojsonProps.COUNTY_ID; //the geojson primary key

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
                return "counties " + d.properties.COUNTY_ID;
            })
            .attr("d", path)
            .style("fill", function(d){
                var value = d.properties[expressed];
                if(value) {
                    return colorScale(value);
                } else {
                    return "#ccc";
                }
            })
            .on("mouseover", function(d){
                highlight(d.properties);
            })
            .on("mouseout", function(d){
                dehighlight(d.properties);
            })
            .on("mousemove", moveLabel);

        var desc = regions.append("desc")
            .text('{"stroke": "#000", "stroke-width": "0.5px"}');
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

    //function to create diverging color scale generator (Natural Breaks)
    function makeDivColorScale(data){
        var colorClasses = [
            "#ca0020",
            "#f4a582",
            "#f7f7f7",
            "#92c5de",
            "#0571b0"
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

        var max = Math.max.apply(null, domainArray);
    
        colorScale = d3.scaleSequential(d3.interpolateRdYlBu);
        colorScale.domain([-max, max]);
        return colorScale;
    };

    //function to create coordinated bar chart
    function setChart(csvData, colorScale){
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

        //set bars for each province
        var bars = chart.selectAll(".bars")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "bars " + d.COUNTY_ID;
            })
            .attr("width", chartInnerWidth / csvData.length - 1)
            .on("mouseover", highlight)
            .on("mouseout", dehighlight)
            .on("mousemove", moveLabel);

        var desc = bars.append("desc")
            .text('{"stroke": "none", "stroke-width": "0px"}');

        //Create a text element for the chart title
        var chartTitle = chart.append("text")
            .attr("x", 60)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text(setChartTitle(expressed));

        //scale the y axis
        yAxis = d3.axisLeft()
            .scale(yScale);

        //place axis
        axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);

        //create frame for chart border
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        updateChart(bars, csvData.length, colorScale, graph="normal");
    };

    // Return the correct chart title per the field name
    function setChartTitle(expressed){
        if (expressed === "Breeding Species: BBA2"){
            return "Breeding Bird Species: Atlas 2";
        }
        else if (expressed === "Observed Species: BBA2"){
            return "Total Observed Bird Species: Atlas 2";
        }
        else if (expressed === "Effort Hours: BBA2"){
            return "Total Effort Hours: Atlas 2";
        }
        else if (expressed === "Breeding Species: BBA1"){
            return "Breeding Bird Species: Atlas 1";
        }
        else if (expressed === "Observed Species: BBA1"){
            return "Total Observed Bird Species: Atlas 1";
        }
        else if (expressed === "Change in Breeding Birds"){
            return "Change in Breeding Bird Species";
        }
        else if (expressed === "Change in Observed Birds"){
            return "Change in Total Bird Species Observed";
        }
    }

    // Return the correct label title per the field name
    function setLabelTitle(expressed){
        if (expressed === "Breeding Species: BBA2"){
            return "Breeding Bird Species";
        }
        else if (expressed === "Observed Species: BBA2"){
            return "Observed Bird Species";
        }
        else if (expressed === "Effort Hours: BBA2"){
            return "Total Effort Hours";
        }
        else if (expressed === "Breeding Species: BBA1"){
            return "Breeding Bird Species";
        }
        else if (expressed === "Observed Species: BBA1"){
            return "Observed Bird Species";
        }
        else if (expressed === "Change in Breeding Birds"){
            return "Change in Number of Breeding Bird Species";
        }
        else if (expressed === "Change in Observed Birds"){
            return "Change in Total Bird Species Observed";
        }
    }

    // Update the axis 
    function updateChartScale(expressed){
        if (expressed === "Effort Hours: BBA2"){
            yScale = d3.scaleLinear()
                .range([(chartHeight-10), 0])
                .domain([0, 10000]);

            yAxis.scale(yScale);
            axis.call(yAxis);
        } else if (expressed === "Change in Breeding Birds"){
            yScale = d3.scaleLinear()
                .range([(chartHeight-10), 0])
                .domain([-30, 60]);

            yAxis.scale(yScale);
            axis.call(yAxis);
        } else if (expressed === "Change in Observed Birds"){
            yScale = d3.scaleLinear()
                .range([(chartHeight-10), 0])
                .domain([-30, 90]);

            yAxis.scale(yScale);
            axis.call(yAxis);
        } else{
            yScale = d3.scaleLinear()
                .range([(chartHeight-10), 0])
                .domain([0, 220]);

            yAxis.scale(yScale);
            axis.call(yAxis);
        }
    }

    //function to create a dropdown menu for attribute selection
    function createDropdown(){
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, csvData)
            });

        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d });
    };

    //dropdown change listener handler
    function changeAttribute(attribute, csvData){
        //change the expressed attribute
        expressed = attribute;

        //recreate the color scale
        var colorScale = makeColorScale(csvData);
        var divColorScale = makeDivColorScale(csvData);

        if (expressed === "Change in Breeding Birds" || expressed === "Change in Observed Birds"){
            //recolor enumeration units
            var counties = d3.selectAll(".counties")
            .transition()
            .duration(1000)
            .style("fill", function(d){
                var value = d.properties[expressed];
                if(value) {
                    return divColorScale(value);
                } else {
                    return "#fff";
                }
            });

            //re-sort, resize, and recolor bars
            var bars = d3.selectAll(".bars")
                //re-sort bars
                .sort(function(a, b){
                    return b[expressed] - a[expressed];
            })
            .transition() //add animation
            .delay(function(d, i){
                return i * 20;
            })
            .duration(500);

            updateChartScale(expressed);

            updateChart(bars, csvData.length, divColorScale, graph="diverging");
        }
        else{
            //recolor enumeration units
            var counties = d3.selectAll(".counties")
            .transition()
            .duration(1000)
            .style("fill", function(d){
                var value = d.properties[expressed];
                if(value) {
                    return colorScale(value);
                } else {
                    return "#ccc";
                }
            });

            //re-sort, resize, and recolor bars
            var bars = d3.selectAll(".bars")
                //re-sort bars
                .sort(function(a, b){
                    return b[expressed] - a[expressed];
            })
            .transition() //add animation
            .delay(function(d, i){
                return i * 20;
            })
            .duration(500);

            updateChartScale(expressed);

            updateChart(bars, csvData.length, colorScale, graph="normal");
        }

        updateDataInfo(expressed);
    };

    //function to position, size, and color bars in chart
    function updateChart(bars, n, colorScale, graph){
        // Check which kind of graph needs to be displayed
        if(graph === "normal"){
            //position bars
            bars.attr("x", function(d, i){
                return i * (chartInnerWidth / n) + leftPadding;
            })
            //size/resize bars
            .attr("height", function(d, i){
                return (chartHeight-10) - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d, i){
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            //color/recolor bars
            .style("fill", function(d){
                var value = d[expressed];
                if(value) {
                    return colorScale(value);
                } else {
                    return "#ccc";
                }
            });
        } else if (graph === "diverging" && expressed === "Change in Breeding Birds"){
            //position bars
            bars.attr("x", function(d, i){
                return i * (chartInnerWidth / n) + leftPadding;
            })
            //size/resize bars
            .attr("height", function(d, i){
                if (d[expressed] > 0){
                    return chartHeight - yScale(parseFloat(d[expressed])) - chartHeight/3 - topBottomPadding;
                } else if (d[expressed] < 0) {
                    return Math.abs(yScale(parseFloat(d[expressed]))) - chartHeight/1.5 + topBottomPadding;
                } else {
                    return 1;
                }
            })
            .attr("y", function(d, i){
                if (d[expressed] > 0){
                    return yScale(parseFloat(d[expressed])) + topBottomPadding;
                } else if (d[expressed] < 0) {
                    return yScale(parseFloat(0)) + topBottomPadding + 1;
                } else {
                    return yScale(parseFloat(0)) + topBottomPadding;
                }
            })
            //color/recolor bars
            .style("fill", function(d){
                var value = d[expressed];
                if(value == 0) {
                    return "#fff"
                } else if (value > 0 || value < 0) {
                    return colorScale(value);
                } else {
                    return "#ccc";
                }
            });
        } else if (graph === "diverging" && expressed === "Change in Observed Birds"){
            //position bars
            bars.attr("x", function(d, i){
                return i * (chartInnerWidth / n) + leftPadding;
            })
            //size/resize bars
            .attr("height", function(d, i){
                if (d[expressed] > 0){
                    return chartHeight - yScale(parseFloat(d[expressed])) - chartHeight/4 - topBottomPadding;
                } else if (d[expressed] < 0) {
                    console.log(Math.abs(yScale(parseFloat(d[expressed]))));
                    return Math.abs(yScale(parseFloat(d[expressed]))) - chartHeight/1.345 + topBottomPadding;
                } else {
                    return 1;
                }
            })
            .attr("y", function(d, i){
                if (d[expressed] > 0){
                    return yScale(parseFloat(d[expressed])) + topBottomPadding;
                } else if (d[expressed] < 0) {
                    return yScale(parseFloat(0)) + topBottomPadding + 1;
                } else {
                    return yScale(parseFloat(0)) + topBottomPadding;
                }
            })
            //color/recolor bars
            .style("fill", function(d){
                var value = d[expressed];
                if(value == 0) {
                    return "#fff"
                } else if (value > 0 || value < 0) {
                    return colorScale(value);
                } else {
                    return "#ccc";
                }
            });
        }
        
        var chartTitle = d3.select(".chartTitle")
            .text(setChartTitle(expressed));
    };

    //function to highlight enumeration units and bars
    function highlight(props){
        //change stroke
        var selected = d3.selectAll("." + props.COUNTY_ID)
            .style("stroke", "red")
            .style("stroke-width", "3");

        setLabel(props);
    };

    //function to reset the element style on mouseout
    function dehighlight(props){
        var selected = d3.selectAll("." + props.COUNTY_ID)
            .style("stroke", function(){
                return getStyle(this, "stroke")
            })
            .style("stroke-width", function(){
                return getStyle(this, "stroke-width")
            });

        d3.select(".infolabel")
            .remove();

        function getStyle(element, styleName){
            var styleText = d3.select(element)
                .select("desc")
                .text();

            var styleObject = JSON.parse(styleText);

            return styleObject[styleName];
        };
    };

    //function to create dynamic label
    function setLabel(props){
        //label content
        var labelAttribute = "<h1>" + props[expressed] +
            "</h1><b>" + setLabelTitle(expressed) + "</b>";

        //create info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.COUNTY_ID + "_label")
            .html(labelAttribute);

        var regionName = infolabel.append("div")
            .attr("class", "labelname")
            .html(props.County);
    };

    //function to move info label with mouse
    function moveLabel(){
        //get width of label
        var labelWidth = d3.select(".infolabel")
            .node()
            .getBoundingClientRect()
            .width;
    
        //use coordinates of mousemove event to set label coordinates
        var x1 = d3.event.clientX + 0,
            y1 = d3.event.clientY - 75,
            x2 = d3.event.clientX - labelWidth - 10,
            y2 = d3.event.clientY + 25;
    
        //horizontal label coordinate, testing for overflow
        var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
        //vertical label coordinate, testing for overflow
        var y = d3.event.clientY < 75 ? y2 : y1;

        //Adjust for mobile screens
        if ($(window).width() < 600){
            x = $(window).width()/6;
        }
    
        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    };

    //function to create a div for the background info
    function createBackgroundInfo(){
        //add text
        $('body').append('<div id="background">The Wisconsin Breeding Bird Atlas \
        is a comprehensive field survey documenting the distribution and abundance \
        of birds breeding across the state. Birds are an essential part of Wisconsin’s \
        culture and ecology. However many species face grave threats from habitat loss, climate \
        change, and other human-caused pressures.  Nearly one-third are or will become imperiled \
        without intervention. The first Wisconsin Breeding Bird Atlas was conducted from \
        1995 until 2000 followed by the second Atlas from 2015 until 2020. The information \
        collected between the two surveys allows biologists to measure changes in bird populations \
        from the first survey to the second and to predict future changes. These insights will help \
        biologists identify the conservation needs of breeding birds and better meet those needs.\
        <br><br><a style="font-size: 16px;">Data Source: eBird, Wisconsin Breeding Bird Atlas - <a style="font-size: 16px;" href="https://ebird.org/atlaswi/state/US-WI" target="_blank">https://ebird.org/atlaswi/state/US-WI</a>\
        <br><a style="font-size: 16px;">Map Author: Josh Seibel, 2020</a></div>');
    };

    //function to create a div for the current data display info
    function createDataInfo(){
        //add select element
        $('body').append('<div id="info-wrapper"></div>');
        $('#info-wrapper').html('<div id="filler"></div>');
        $('#info-wrapper').append('<div id="datainfo">*The number of confirmed breeding bird species within the county during Atlas 2.</div>');
    };

    //function to update the DataInfo div with the current data display info
    function updateDataInfo(expressed){
        //change data contents
        if (expressed === "Breeding Species: BBA2"){
            $('#datainfo').html('*The number of confirmed breeding bird species within a county during Atlas 2 (2015-2020).');
        }
        else if (expressed === "Observed Species: BBA2"){
            $('#datainfo').html('*The total number of bird species observed within the county during Atlas 2 (2015-2020).');
        }
        else if (expressed === "Effort Hours: BBA2"){
            $('#datainfo').html('*The total amount of hours that surveyors put into the county searching for bird species during Atlas 2 (2015-2020). \
            <br><br> *The effort hours were not recorded during Atlas 1 and are not visualized in this dataset.');
        }
        else if (expressed === "Breeding Species: BBA1"){
            $('#datainfo').html('*The number of confrimed breeding bird species within the county during Atlas 1 (1995-2000).');
        }
        else if (expressed === "Observed Species: BBA1"){
            $('#datainfo').html('*The total number of bird species observed within the county during Atlas 1 (1995-2000).');
        }
        else if (expressed === "Change in Breeding Birds"){
            $('#datainfo').html('*The change in number of confirmed breeding bird species from Atlas 1 to Atlas 2');
        }
        else if (expressed === "Change in Observed Birds"){
            $('#datainfo').html('*The change in number of observed bird species from Atlas 1 to Atlas 2');
        }
    };

})(); //last line of main.js


// Open popup warning to view on desktop if user opens in mobile
// Otherwise Splash Screen when start
$(window).on("resize load", function () {
    if ($( window ).width() <= 600) {
        $('#mobile-screen').modal('show');
        $('#splash-screen').modal('hide');
    } else if ($( window ).width() > 600){
        $('#mobile-screen').modal('hide');
        $('#splash-screen').modal('show');
    }
});
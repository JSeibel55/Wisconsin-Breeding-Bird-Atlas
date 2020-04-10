//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function(){

    //pseudo-global variables
    var attrArray = ["varA", "varB", "varC", "varD", "varE"]; //list of attributes
    var expressed = attrArray[0]; //initial attribute

    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 473;

    //create a scale to size bars proportionally to frame and for axis
    var yScale = d3.scaleLinear()
            .range([0, chartHeight])
            .domain([0, 105]);
    
    //begin script when window loads
    window.onload = setMap();
    
    //Set up choropleth map
    function setMap(){
        //map frame dimensions
        var width = window.innerWidth * 0.5,
            height = 473;

        //create new svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        //create Albers equal area conic projection centered on France
        var projection = d3.geoAlbers()
            .center([0, 46.2])
            .rotate([-2, 0, 0])
            .parallels([43, 62])
            .scale(2500)
            .translate([width / 2, height / 2]);

        var path = d3.geoPath()
        .projection(projection);

        // //use Promise.all to parallelize asynchronous data loading
        // var promises = [];
        // promises.push(d3.csv("data/unitsData.csv")); //load attributes from csv
        // promises.push(d3.json("data/EuropeCountries.json")); //load background spatial data
        // promises.push(d3.json("data/FranceRegions.json")); //load choropleth spatial data
        // Promise.all(promises).then(callback);
        // use Promise.all to parallelize asynchronous data loading
        var promises = [d3.csv("data/unitsData.csv"),
                        d3.json("data/EuropeCountries.json"),
                        d3.json("data/FranceRegions.json")
                    ];
        Promise.all(promises).then(callback);

        function callback(data){
            csvData = data[0];
            europe = data[1];
            france = data[2];

            //place graticule on the map
            setGraticule(map, path);

            //translate europe TopoJSON
            var europeCountries = topojson.feature(europe, europe.objects.EuropeCountries),
                franceRegions = topojson.feature(france, france.objects.FranceRegions).features;

            //add Europe countries to map
            var countries = map.append("path")
                .datum(europeCountries)
                .attr("class", "countries")
                .attr("d", path);

            //join csv data to GeoJSON enumeration units
            franceRegions = joinData(franceRegions, csvData);

            //create the color scale
            var colorScale = makeColorScale(csvData);

            //add enumeration units to the map
            setEnumerationUnits(franceRegions, map, path, colorScale);

            //add coordinated visualization to the map
            setChart(csvData, colorScale);

            //add a drop down menu
            createDropdown(csvData);
        };
    }; //end of setMap() 

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

    //Loop through csv to assign each set of csv attribute values to geojson region
    function joinData(franceRegions, csvData){
        for (var i=0; i<csvData.length; i++){
            var csvRegion = csvData[i]; //the current region
            var csvKey = csvRegion.adm1_code; //the CSV primary key

            //loop through geojson regions to find correct region
            for (var a=0; a<franceRegions.length; a++){

                var geojsonProps = franceRegions[a].properties; //the current region geojson properties
                var geojsonKey = geojsonProps.adm1_code; //the geojson primary key

                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey){

                    //assign all attributes and values
                    attrArray.forEach(function(attr){
                        var val = parseFloat(csvRegion[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                };
            };
        };
    
        return franceRegions;
    };

    //Add France regions to map
    function setEnumerationUnits(franceRegions, map, path, colorScale){
        var regions = map.selectAll(".regions")
        .data(franceRegions)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "regions " + d.properties.adm1_code;
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

    //function to create color scale generator
    function makeColorScale(data){
        //Create Quantile color scale
        // var colorClasses = [
        //     "#D4B9DA",
        //     "#C994C7",
        //     "#DF65B0",
        //     "#DD1C77",
        //     "#980043"
        // ];

        // //create color scale generator
        // var colorScale = d3.scaleQuantile()
        //     .range(colorClasses);

        // //build array of all values of the expressed attribute
        // var domainArray = [];
        // for (var i=0; i<data.length; i++){
        //     var val = parseFloat(data[i][expressed]);
        //     domainArray.push(val);
        // };

        // //assign array of expressed values as scale domain
        // colorScale.domain(domainArray);

        // return colorScale;

        //Create Equal Enterval color scale 
        // var colorClasses = [
        //     "#D4B9DA",
        //     "#C994C7",
        //     "#DF65B0",
        //     "#DD1C77",
        //     "#980043"
        // ];
    
        // //create color scale generator
        // var colorScale = d3.scaleQuantile()
        //     .range(colorClasses);
    
        // //build two-value array of minimum and maximum expressed attribute values
        // var minmax = [
        //     d3.min(data, function(d) { return parseFloat(d[expressed]); }),
        //     d3.max(data, function(d) { return parseFloat(d[expressed]); })
        // ];
        // //assign two-value array as scale domain
        // colorScale.domain(minmax);
    
        // return colorScale;

        //Create Natural Breaks color scale
        var colorClasses = [
            "#D4B9DA",
            "#C994C7",
            "#DF65B0",
            "#DD1C77",
            "#980043"
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
        //create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        //set bars for each province
        var bars = chart.selectAll(".bars")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return a[expressed]-b[expressed]
            })
            .attr("class", function(d){
                return "bars " + d.adm1_code;
            })
            .attr("width", chartWidth / csvData.length - 1)
            .on("mouseover", highlight)
            .on("mouseout", dehighlight)
            .on("mousemove", moveLabel);

        var desc = bars.append("desc")
            .text('{"stroke": "none", "stroke-width": "0px"}');

        //annotate bars with attribute value text
        var numbers = chart.selectAll(".numbers")
            .data(csvData)
            .enter()
            .append("text")
            .sort(function(a, b){
                return a[expressed]-b[expressed]
            })
            .attr("class", function(d){
                return "numbers " + d.adm1_code;
            })
            .attr("text-anchor", "middle")
            .attr("x", function(d, i){
                var fraction = chartWidth / csvData.length;
                return i * fraction + (fraction - 1) / 2;
            })
            .attr("y", function(d){
                return chartHeight - yScale(parseFloat(d[expressed])) + 15;
            })
            .text(function(d){
                return d[expressed];
            })
            .on("mouseover", highlight)
            .on("mouseout", dehighlight);

        var desc2 = numbers.append("desc")
            .text('{"stroke": "none", "stroke-width": "0px"}');

        //Create a text element for the chart title
        var chartTitle = chart.append("text")
            .attr("x", 20)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text("Number of Variable " + expressed[3] + " in each region");

        updateChart(bars, numbers, csvData.length, colorScale);
    };

    //function to create a dropdown menu for attribute selection
    function createDropdown(csvData){
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

        //recolor enumeration units
        var regions = d3.selectAll(".regions")
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

        //re-sort
        var bars = d3.selectAll(".bars")
            //re-sort bars
            .sort(function(a, b){
                return a[expressed] - b[expressed];
            })
            .transition() //add animation
            .delay(function(d, i){
                return i * 20
            })
            .duration(500);

        var numbers = d3.selectAll(".numbers")
            //re-sort numbers
            .sort(function(a, b){
                return a[expressed] - b[expressed];
            })
            .transition() //add animation
            .delay(function(d, i){
                return i * 20
            })
            .duration(500);

        updateChart(bars, numbers, csvData.length, colorScale)
    };

    //function to position, size, and color bars in chart
    function updateChart(bars, numbers, n, colorScale){
        //position bars
        bars.attr("x", function(d, i){
            return i * (chartWidth / n);
        })
        //size/resize bars
        .attr("height", function(d, i){
            return yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return chartHeight - yScale(parseFloat(d[expressed]));
        })
        //color/recolor bars
        .style("fill", function(d){
            var value = d[expressed];
            if(value) {
                return colorScale(value);
            } else {
                return "#CCC";
            }
        });

        //Update the title
        var chartTitle = d3.select(".chartTitle")
            .text("Number of Variable " + expressed[3] + " in each region");

        //update bars with attribute value text
        numbers.attr("x", function(d, i){
                var fraction = chartWidth / csvData.length;
                return i * fraction + (fraction - 1) / 2;
            })
            .attr("y", function(d){
                return chartHeight - yScale(parseFloat(d[expressed])) + 15;
            })
            .text(function(d){
                return d[expressed];
        });
    };

    //function to highlight enumeration units and bars
    function highlight(props){
        //change stroke
        var selected = d3.selectAll("." + props.adm1_code)
            .style("stroke", "blue")
            .style("stroke-width", "2");

        setLabel(props);
    };

    //function to reset the element style on mouseout
    function dehighlight(props){
        d3.select(".infolabel")
            .remove();
        var selected = d3.selectAll("." + props.adm1_code)
            .style("stroke", function(){
                return getStyle(this, "stroke")
            })
            .style("stroke-width", function(){
                return getStyle(this, "stroke-width")
            });

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
            "</h1><b>" + expressed + "</b>";

        //create info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.adm1_code + "_label")
            .html(labelAttribute);

        var regionName = infolabel.append("div")
            .attr("class", "labelname")
            .html(props.name);
    };

    //function to move info label with mouse
    function moveLabel(){
        //get width of label
        var labelWidth = d3.select(".infolabel")
            .node()
            .getBoundingClientRect()
            .width;
    
        //use coordinates of mousemove event to set label coordinates
        var x1 = d3.event.clientX + 10,
            y1 = d3.event.clientY - 75,
            x2 = d3.event.clientX - labelWidth - 10,
            y2 = d3.event.clientY + 25;
    
        //horizontal label coordinate, testing for overflow
        var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
        //vertical label coordinate, testing for overflow
        var y = d3.event.clientY < 75 ? y2 : y1; 
    
        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    };
})(); //last line of main.js



(async function () {
    const rawData = await d3.csv("../data/data_ggsheet.csv", d => ({
      maNhom: d["Mã nhóm hàng"],
      tenNhom: d["Tên nhóm hàng"],
      sl: +d["SL"],
      thanhtien: +d["Thành tiền"]
    }));
  
    // Gom nhóm theo nhóm hàng
    const agg = d3.rollups(
      rawData,
      v => ({
        maNhom: v[0].maNhom,
        tenNhom: v[0].tenNhom,
        sumSL: d3.sum(v, d => d.sl),
        sumTien: d3.sum(v, d => d.thanhtien)
      }),
      d => d.maNhom
    ).map(([_, val]) => val);
  
    // Sắp xếp giảm dần
    agg.sort((a, b) => d3.descending(a.sumTien, b.sumTien));
  
    const margin = { top: 20, right: 150, bottom: 50, left: 200 };
    const svgWidth = 1100, svgHeight = 600;
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;
  
    const svg = d3.select("#chart")
      .attr("width", svgWidth)
      .attr("height", svgHeight)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    // Scale
    const x = d3.scaleLinear()
      .domain([0, d3.max(agg, d => d.sumTien)]).nice()
      .range([0, width]);
  
    const y = d3.scaleBand()
      .domain(agg.map(d => `[${d.maNhom}] ${d.tenNhom}`))
      .range([0, height])
      .padding(0.3);
  
    const color = d3.scaleOrdinal(d3.schemeTableau10)
      .domain(agg.map(d => `[${d.maNhom}] ${d.tenNhom}`));
  
    // Axes
    svg.append("g")
      .call(d3.axisLeft(y).tickSize(0).tickPadding(6));
  
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(10).tickFormat(d3.format(".2s")));
  
    // Tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);
  
    // Bars
    svg.selectAll("rect")
      .data(agg)
      .enter()
      .append("rect")
      .attr("y", d => y(`[${d.maNhom}] ${d.tenNhom}`))
      .attr("x", 0)
      .attr("height", y.bandwidth())
      .attr("width", d => x(d.sumTien))
      .attr("fill", d => color(`[${d.maNhom}] ${d.tenNhom}`))
      .on("mouseover", function (event, d) {
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`
          <b>Nhóm hàng:</b> [${d.maNhom}] ${d.tenNhom}<br/>
          <b>Số lượng bán:</b> ${d3.format(",")(d.sumSL)}<br/>
          <b>Doanh số bán:</b> ${Math.round(d.sumTien / 1e6)} Triệu VND
        `)
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 28) + "px");
      })
      .on("mousemove", function (event) {
        tooltip.style("left", (event.pageX + 15) + "px")
               .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function () {
        tooltip.transition().duration(300).style("opacity", 0);
      });
  
    // Label giá trị trên bar
    svg.selectAll(".label")
      .data(agg)
      .enter()
      .append("text")
      .attr("x", d => x(d.sumTien) + 5)
      .attr("y", d => y(`[${d.maNhom}] ${d.tenNhom}`) + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .text(d => `${Math.round(d.sumTien / 1e6)} Triệu VNĐ`)
      .style("font-size", "12px")
      .style("fill", "#111827");
  
  })();
  
(async function () {
    // Đọc dữ liệu từ CSV
    const raw = await d3.csv("../data/data_ggsheet.csv", d => ({
      maKh: d["Mã khách hàng"],
      maDon: d["Mã đơn hàng"]
    }));
  
    // =========================
    // TÍNH TOÁN
    // =========================
    // Số lần mua của từng khách hàng
    const purchasesByCustomer = d3.rollup(
      raw,
      v => new Set(v.map(d => d.maDon)).size,
      d => d.maKh
    );
  
    // Phân phối: số khách hàng theo số lần mua
    const distribution = d3.rollups(
      purchasesByCustomer,
      v => v.length,
      d => d[1] // số lần mua
    ).map(([lanMua, soKhach]) => ({
      lanMua: +lanMua,
      soKhach
    })).sort((a, b) => d3.ascending(a.lanMua, b.lanMua));
  
    // =========================
    // TOOLTIP
    // =========================
    const tooltip = d3.select("body").append("div")
      .attr("class","tooltip")
      .style("opacity",0)
      .style("position","absolute")
      .style("background","#fff")
      .style("border","1px solid #ccc")
      .style("padding","8px")
      .style("border-radius","4px")
      .style("font-size","13px")
      .style("color","#000")
      .style("pointer-events","none");
  
    // =========================
    // VẼ BIỂU ĐỒ
    // =========================
    const svgW = 950, svgH = 500;
    const margin = { top: 50, right: 30, bottom: 40, left: 80 };
    const width = svgW - margin.left - margin.right;
    const height = svgH - margin.top - margin.bottom;
  
    const svg = d3.select("#q11")
      .append("svg")
      .attr("width", svgW)
      .attr("height", svgH);
  
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    const x = d3.scaleBand()
      .domain(distribution.map(d => d.lanMua))
      .range([0, width])
      .padding(0.2);
  
    const y = d3.scaleLinear()
      .domain([0, d3.max(distribution, d => d.soKhach)]).nice()
      .range([height, 0]);
  
    // Trục
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));
  
    g.append("g")
      .call(d3.axisLeft(y).ticks(10));
  
    // Bars
    g.selectAll("rect")
      .data(distribution)
      .enter()
      .append("rect")
      .attr("x", d => x(d.lanMua))
      .attr("y", d => y(d.soKhach))
      .attr("width", x.bandwidth())
      .attr("height", d => height - y(d.soKhach))
      .attr("fill", "#377eb8")
      .on("mouseover", (event, d) => {
        tooltip.transition().duration(200).style("opacity",1);
        tooltip.html(`
          Đã mua <b>${d.lanMua}</b> lần<br/>
          Số lượng khách hàng: <b>${d3.format(",")(d.soKhach)}</b>
        `)
        .style("left",(event.pageX+15)+"px")
        .style("top",(event.pageY-28)+"px");
      })
      .on("mousemove", event => {
        tooltip.style("left",(event.pageX+15)+"px")
               .style("top",(event.pageY-28)+"px");
      })
      .on("mouseout", () => tooltip.transition().duration(300).style("opacity",0));
  
    // Title
    svg.append("text")
      .attr("x", svgW/2)
      .attr("y", 25)
      .attr("text-anchor", "middle")
      .style("font-size","16px")
      .style("fill","#1f4e79")
      .text("Phân phối Lượt mua hàng");
  
    // Y label
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -svgH/2)
      .attr("y", 20)
      .style("text-anchor", "middle")
      .style("font-size","13px")
      .text("Số khách hàng");
  })();
  
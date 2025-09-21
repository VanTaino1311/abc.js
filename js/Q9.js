(async function () {
    const raw = await d3.csv("../data/data_ggsheet.csv", d => ({
      maDon: d["Mã đơn hàng"],
      maNhom: d["Mã nhóm hàng"],
      tenNhom: d["Tên nhóm hàng"],
      maHang: d["Mã mặt hàng"],
      tenHang: d["Tên mặt hàng"]
    }));
  
    // =========================
    // TÍNH TOÁN
    // =========================
    raw.forEach(d => {
      d.nhom = `[${d.maNhom}] ${d.tenNhom}`;
      d.hang = `[${d.maHang}] ${d.tenHang}`;
    });
  
    // Đếm số đơn hàng duy nhất theo (Nhóm hàng, Mặt hàng)
    const ordersByItem = d3.rollups(
      raw,
      v => new Set(v.map(d => d.maDon)).size,
      d => d.nhom,
      d => d.hang
    );
  
    // Tổng số đơn hàng theo Nhóm hàng
    const ordersByGroup = d3.rollups(
      raw,
      v => new Set(v.map(d => d.maDon)).size,
      d => d.nhom
    );
    const totalMap = new Map(ordersByGroup);
  
    // Chuẩn hóa dữ liệu
    let df_item_prob = [];
    ordersByItem.forEach(([nhom, arr]) => {
      arr.forEach(([hang, soDon]) => {
        df_item_prob.push({
          nhom,
          hang,
          soDon,
          xacsuat: soDon / totalMap.get(nhom) * 100
        });
      });
    });
  
    // =========================
    // TOOLTIP (chỉ tạo 1 lần, ép màu chữ đen)
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
      .style("pointer-events","none")
      .style("color","#000");   // ⚡ ép chữ đen
  
    // =========================
    // VẼ DASHBOARD
    // =========================
    const nhomList = ["[BOT] Bột", "[SET] Set trà", "[THO] Trà hoa", "[TMX] Trà mix", "[TTC] Trà củ, quả sấy"];
    const dashboard = d3.select("#dashboard");
  
    nhomList.forEach(nhom => {
      const groupData = df_item_prob
        .filter(d => d.nhom === nhom)
        .sort((a, b) => d3.descending(a.xacsuat, b.xacsuat));
  
      // Container cho mỗi chart
      const container = dashboard.append("div")
        .attr("class", "chart-container")
        .style("border", "1px solid #e5e7eb")
        .style("padding", "10px")
        .style("border-radius", "6px")
        .style("background", "#fff");
  
      // Title
      container.append("h3")
        .style("text-align","center")
        .style("color","#1f4e79")
        .text(nhom);
  
      const svgW = 380, svgH = 260;
      const margin = { top: 10, right: 30, bottom: 30, left: 160 };
      const width = svgW - margin.left - margin.right;
      const height = svgH - margin.top - margin.bottom;
  
      const svg = container.append("svg")
        .attr("width", svgW)
        .attr("height", svgH)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
  
      // Scale
      const y = d3.scaleBand()
        .domain(groupData.map(d => d.hang))
        .range([0, height])
        .padding(0.2);
  
      const x = d3.scaleLinear()
        .domain([0, d3.max(groupData, d => d.xacsuat)]).nice()
        .range([0, width]);
  
      const color = d3.scaleOrdinal(d3.schemeTableau10)
        .domain(groupData.map(d => d.hang));
  
      // Axis
      svg.append("g").call(d3.axisLeft(y).tickSize(0).tickPadding(4));
      svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d => d + "%"));
  
      // Bars
      svg.selectAll("rect")
        .data(groupData)
        .enter()
        .append("rect")
        .attr("y", d => y(d.hang))
        .attr("height", y.bandwidth())
        .attr("x", 0)
        .attr("width", d => x(d.xacsuat))
        .attr("fill", d => color(d.hang))
        .on("mouseover", (event,d) => {
          tooltip.transition().duration(150).style("opacity",1);
          tooltip.html(`
            <b>Mặt hàng:</b> ${d.hang}<br/>
            <b>Nhóm hàng:</b> ${d.nhom}<br/>
            <b>SL Đơn Bán:</b> ${d3.format(",")(d.soDon)}<br/>
            <b>Xác suất Bán/ Nhóm hàng:</b> ${d.xacsuat.toFixed(1)}%
          `)
          .style("left",(event.pageX+15)+"px")
          .style("top",(event.pageY-28)+"px");
        })
        .on("mousemove", event => {
          tooltip.style("left",(event.pageX+15)+"px")
                 .style("top",(event.pageY-28)+"px");
        })
        .on("mouseout", () => tooltip.transition().duration(200).style("opacity",0));
  
      // Label %
      svg.selectAll(".label")
        .data(groupData)
        .enter()
        .append("text")
        .attr("x", d => x(d.xacsuat) + 5)
        .attr("y", d => y(d.hang) + y.bandwidth()/2)
        .attr("alignment-baseline","middle")
        .text(d => d.xacsuat.toFixed(1) + "%")
        .style("font-size","11px")
        .style("fill","#111827");
    });
  })();
  
// app.js

document.addEventListener("DOMContentLoaded", function() {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    const legend = document.getElementById('legend');
    const colorPicker = document.getElementById("color-picker");
  
    let prevMouseX, prevMouseY, isDrawing = false, snapshot, selectedTool = "brush", brushWidth = 5, selectedColor = "#000";
    let fillColor = { checked: false };
    let rectangles = [];
    let pdfSnapshot = null;
  
    // Event listener para cargar un archivo PDF
    const uploadPDFInput = document.getElementById("upload-pdf");
    uploadPDFInput.addEventListener("change", () => {
      const file = uploadPDFInput.files[0];
      const reader = new FileReader();
  
      reader.onload = (event) => {
        const pdfData = event.target.result;
  
        // Limpiar canvas antes de renderizar PDF
        ctx.clearRect(0, 0, canvas.width, canvas.height);
  
        // Renderizado de la primera página del PDF en el canvas
        pdfjsLib.getDocument({ data: pdfData })
          .promise.then((pdf) => {
            return pdf.getPage(1);
          })
          .then((page) => {
            const viewport = page.getViewport({ scale: 1.5 });
            canvas.width = viewport.width;
            canvas.height = viewport.height;
  
            const renderContext = {
              canvasContext: ctx,
              viewport: viewport,
            };
            return page.render(renderContext).promise;
          })
          .then(() => {
            // Guardar una copia del PDF renderizado
            pdfSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
          })
          .catch((error) => {
            console.error("Error al renderizar el PDF:", error);
          });
      };
  
      if (file) {
        reader.readAsArrayBuffer(file);
      }
    });
  
    // Función para dibujar un rectángulo
    const drawRect = (rect) => {
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.width, rect.height);
      ctx.lineWidth = rect.brushWidth;
      ctx.strokeStyle = rect.color;
      ctx.stroke();
      if (rect.fill) {
        ctx.fillStyle = rect.color;
        ctx.fill();
      }
    };
  
    // Función para redibujar todos los rectángulos
    const redrawRectangles = () => {
      if (pdfSnapshot) {
        ctx.putImageData(pdfSnapshot, 0, 0);
      }
      rectangles.forEach((rect, index) => {
        drawRect(rect);
      });
      drawAllLegends(); // Redibujar todas las leyendas
    };
  // Función para dibujar todas las leyendas
  const drawAllLegends = () => {
    const padding = 5;
    const textHeight = 14;
    const lineSpacing = 5;
    const totalHeight = (textHeight + lineSpacing) * rectangles.length;
    const x = canvas.width - 275 - padding;
    const y = canvas.height - totalHeight - padding;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(x - padding, y - padding, 275, totalHeight + padding * 2);

    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    rectangles.forEach((rect, index) => {
        const textY = y + (index + 1) * (textHeight + lineSpacing);
        const pixelToCm = 2.54 / (window.devicePixelRatio * 96);
        const areaCm2 = (rect.width * pixelToCm * rect.height * pixelToCm / 2).toFixed(2); // Calcular el área como base por altura sobre 2 y convertir a cm²
        ctx.fillText(`${rect.dimensions}, Área: ${areaCm2} cm²`, x, textY);
    });
};

  
    // Event listener para dibujar rectángulos
    canvas.addEventListener("mousedown", (e) => {
      if (selectedTool === "rectangle") {
        isDrawing = true;
        prevMouseX = e.offsetX;
        prevMouseY = e.offsetY;
        snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
        // Mostrar leyenda al iniciar el dibujo del rectángulo
        legend.style.display = 'block';
      }
    });
  
    canvas.addEventListener("mousemove", (e) => {
      if (!isDrawing || selectedTool !== "rectangle") return;
      ctx.putImageData(snapshot, 0, 0);
      const currentRect = {
        x: prevMouseX,
        y: prevMouseY,
        width: e.offsetX - prevMouseX,
        height: e.offsetY - prevMouseY,
        color: selectedColor,
        brushWidth: brushWidth,
        fill: fillColor.checked
      };
      drawRect(currentRect);
    });
  
    canvas.addEventListener("mouseup", (e) => {
      if (selectedTool === "rectangle") {
        isDrawing = false;
        const widthPx = Math.abs(e.offsetX - prevMouseX);
        const heightPx = Math.abs(e.offsetY - prevMouseY);
  
        // Convertir dimensiones de píxeles a cm
        const pixelToCm = 2.54 / (window.devicePixelRatio * 96); // Suponiendo que 1 pulgada = 96 píxeles y que la densidad de píxeles de la pantalla puede afectar
        const widthCm = widthPx * pixelToCm;
        const heightCm = heightPx * pixelToCm;
  
        // Agregar rectángulo a la lista
        const newRect = {
          x: prevMouseX,
          y: prevMouseY,
          width: e.offsetX - prevMouseX,
          height: e.offsetY - prevMouseY,
          color: selectedColor,
          brushWidth: brushWidth,
          fill: fillColor.checked,
          dimensions: `Width: ${widthCm.toFixed(2)} cm, Height: ${heightCm.toFixed(2)} cm`
        };
        rectangles.push(newRect);
  
        // Redibujar todas las leyendas
        redrawRectangles();
      }
    });
  
    // Event listener para detectar clics en los rectángulos y borrarlos con el borrador
    canvas.addEventListener("mousedown", (e) => {
      if (selectedTool === "eraser") {
        const mouseX = e.offsetX;
        const mouseY = e.offsetY;
  
        rectangles.forEach((rect, index) => {
          const inRect = mouseX > rect.x && mouseX < rect.x + rect.width &&
            mouseY > rect.y && mouseY < rect.y + rect.height;
          if (inRect) {
            // Remove rectangle and corresponding legend entry
            rectangles.splice(index, 1);
            redrawRectangles(); // Redibujar después de eliminar
          }
        });
      }
    });
  
    // Limpiar canvas y leyenda
    document.querySelector('.clear-canvas').addEventListener('click', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      rectangles = [];
      legend.innerHTML = '';
      legend.style.display = 'none';
      if (pdfSnapshot) {
        ctx.putImageData(pdfSnapshot, 0, 0);
      }
    });
  
    // Guardar imagen
    document.querySelector('.save-img').addEventListener('click', () => {
      const link = document.createElement("a");
      link.download = `${Date.now()}.jpg`;
      link.href = canvas.toDataURL();
      link.click();
    });
  
    // Event listener para cambiar el tamaño del pincel
    document.querySelector('#size-slider').addEventListener('change', () => {
      brushWidth = document.querySelector('#size-slider').value;
    });
  
    // Event listener para cambiar el color de dibujo
    colorPicker.addEventListener('input', () => {
      selectedColor = colorPicker.value;
    });
  
    // Event listener para activar la herramienta de rectángulo
    document.querySelector('#rectangle').addEventListener('click', () => {
      selectedTool = 'rectangle';
      document.querySelector('.tool.active').classList.remove('active');
      document.querySelector('#rectangle').classList.add('active');
      legend.style.display = 'none'; // Ocultar leyenda cuando se cambia de herramienta
    });
  
    // Event listener para activar la herramienta de borrador
    document.querySelector('#eraser').addEventListener('click', () => {
      selectedTool = 'eraser';
      document.querySelector('.tool.active').classList.remove('active');
      document.querySelector('#eraser').classList.add('active');
      legend.style.display = 'none'; // Ocultar leyenda cuando se cambia de herramienta
    });
  
    // Event listener para activar el relleno de color
    document.querySelector('#fill-color').addEventListener('change', () => {
      fillColor.checked = !fillColor.checked; // Alternar el estado del checkbox
    });
  
  });
  
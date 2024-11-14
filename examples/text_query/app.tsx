import React, { useState, useRef, useCallback, useEffect } from "react";
import * as styles from "styles/components.css";
import { Button, Rows, Text, Alert } from "@canva/app-ui-kit";
import { useAddElement } from "utils/use_add_element";

export const App = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{ x: number; y: number } | null>(null);
  const [colorHistory, setColorHistory] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const addElement = useAddElement();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (selectedImage && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
      };
      img.src = selectedImage;
    }
  }, [selectedImage]);

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.round((event.clientX - rect.left) * scaleX);
      const y = Math.round((event.clientY - rect.top) * scaleY);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const imageData = ctx.getImageData(x, y, 1, 1);
        const [r, g, b] = imageData.data;
        const hexColor = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        setSelectedColor(hexColor);
        setCoordinates({ x, y });
        updateColorHistory(hexColor);
      }
    }
  }, []);

  const updateColorHistory = (color: string) => {
    setColorHistory(prevHistory => {
      const newHistory = [color, ...prevHistory.filter(c => c !== color)].slice(0, 5);
      return newHistory;
    });
  };

  const copyToClipboard = () => {
    if (selectedColor) {
      navigator.clipboard.writeText(selectedColor);
    }
  };

  // Fonction mise à jour pour ajouter un carré coloré au design
  const addColorSquareToDesign = useCallback(() => {
    if (selectedColor) {
      addElement({
        type: "shape",
        shape: "rectangle",
        width: 100,
        height: 100,
        fill: selectedColor,
        viewBox: {
          left: 0,
          top: 0,
          width: 100,
          height: 100
        }
      });
    }
  }, [selectedColor, addElement]);

  return (
    <div className={styles.scrollContainer}>
      <Rows spacing="3u">
        <Text size="large">Sélecteur de Couleur</Text>
        
        <Button variant="primary" onClick={() => document.getElementById('fileInput')?.click()}>
          Importer une image
        </Button>
        <input
          id="fileInput"
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />

        {selectedImage && (
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{ maxWidth: '100%', height: 'auto', cursor: 'crosshair' }}
          />
        )}

        {selectedColor && coordinates && (
          <Rows spacing="1u">
            <Text>Couleur sélectionnée : {selectedColor}</Text>
            <Text>Coordonnées : ({coordinates.x}, {coordinates.y})</Text>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                backgroundColor: selectedColor,
                marginBottom: '10px'
              }}
            />
            <Button variant="secondary" onClick={copyToClipboard}>
              Copier le code HEX
            </Button>
            <Button variant="secondary" onClick={addColorSquareToDesign}>
              Ajouter au design
            </Button>
          </Rows>
        )}
        
        {colorHistory.length > 0 && (
          <Rows spacing="1u">
            <Text>Historique des couleurs :</Text>
            <div style={{ display: 'flex', gap: '10px' }}>
              {colorHistory.map((color, index) => (
                <div
                  key={index}
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    backgroundColor: color,
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
          </Rows>
        )}
        
        {!selectedImage && (
          <Alert tone="warn">
            Veuillez importer une image pour commencer.
          </Alert>
        )}
      </Rows>
    </div>
  );
};

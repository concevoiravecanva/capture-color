import React, { useState, useRef, useCallback, useEffect } from "react";
import * as styles from "styles/components.css";
import { Button, Rows, Text, Alert } from "@canva/app-ui-kit";
import { addElementAtPoint } from "@canva/design";
import { useFeatureSupport } from "utils/use_feature_support";

export const App: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>("#000000"); // Initialisation avec une couleur par défaut
  const [colorHistory, setColorHistory] = useState<string[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [guideMessage, setGuideMessage] = useState<string | null>("Veuillez importer une image (formats acceptés : JPEG, PNG, GIF).");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isSupported = useFeatureSupport();
  const isRequiredFeatureSupported = isSupported(addElementAtPoint);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setGuideMessage("Veuillez sélectionner un pixel de l'image.");
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
        if (hexColor.length === 7) { // Vérification de la validité de la couleur
          setSelectedColor(hexColor);
          updateColorHistory(hexColor);
          setGuideMessage(null);
        }
      }
    }
  }, []);

  const updateColorHistory = (color: string) => {
    if (color && color.startsWith('#') && color.length === 7) {
      setColorHistory(prevHistory => {
        const newHistory = [color, ...prevHistory.filter(c => c !== color)].slice(0, 5);
        return newHistory;
      });
    }
  };

  const copyToClipboard = () => {
    if (selectedColor) {
      navigator.clipboard.writeText(selectedColor);
      setFeedbackMessage("Code HEX copié !");
      setTimeout(() => setFeedbackMessage(null), 2000);
    }
  };

  const addColorToDesign = useCallback(async () => {
    if (selectedColor) {
      try {
        await addElementAtPoint({
          type: "shape",
          top: 0,
          left: 0,
          width: 100,
          height: 100,
          viewBox: {
            width: 100,
            height: 100,
            top: 0,
            left: 0,
          },
          paths: [
            {
              d: "M 0 0 H 100 V 100 H 0 Z",
              fill: {
                color: selectedColor,
                dropTarget: false,
              },
            },
          ],
        });
        setFeedbackMessage("Couleur ajoutée au design !");
      } catch (error) {
        console.error('Failed to add color:', error);
        setFeedbackMessage("Erreur lors de l'ajout de la couleur");
      }
      setTimeout(() => setFeedbackMessage(null), 2000);
    }
  }, [selectedColor]);

  return (
    <div className={styles.scrollContainer}>
      <Rows spacing="3u">
        <Text size="large">Sélecteur de Couleur</Text>

        {guideMessage && (
          <Alert tone="info">
            {guideMessage}
          </Alert>
        )}

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

        {selectedColor && (
          <Rows spacing="1u">
            <Text>Couleur sélectionnée : {selectedColor}</Text>
            <div
              style={{
                width: '50px',
                height: '50px',
                backgroundColor: selectedColor,
                border: '1px solid #ccc',
                marginBottom: '10px'
              }}
            />
          </Rows>
        )}

        <Button variant="secondary" onClick={copyToClipboard} disabled={!selectedColor}>
          Copier le code HEX
        </Button>

        {isRequiredFeatureSupported ? (
          <Button variant="secondary" onClick={addColorToDesign} disabled={!selectedColor}>
            Ajouter la couleur au design
          </Button>
        ) : (
          <Alert tone="critical">
            La fonctionnalité d'ajout d'éléments n'est pas prise en charge dans ce contexte.
          </Alert>
        )}

        {feedbackMessage && (
          <Text size="small" tone="success">{feedbackMessage}</Text>
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
                    borderRadius: '5%',
                    backgroundColor: color,
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
          </Rows>
        )}

        {!selectedImage && !guideMessage && (
          <Alert tone="warn">
            Veuillez importer une image pour commencer.
          </Alert>
        )}
      </Rows>
    </div>
  );
};

export default App;

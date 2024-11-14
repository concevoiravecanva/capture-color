import React, { useState } from 'react';
import { Button, Text, Box } from '@canva/app-ui-kit';
import { addNativeEventListener, colorFromHex } from '@canva/design';

export function App() {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const activateEyedropper = async () => {
    try {
      const color = await new (window as any).EyeDropper().open();
      setSelectedColor(color.sRGBHex);
    } catch (error) {
      console.error('Eyedropper error:', error);
    }
  };

  const copyToClipboard = () => {
    if (selectedColor) {
      navigator.clipboard.writeText(selectedColor);
    }
  };

  return (
    <Box padding="small">
      <Text size="xlarge" weight="bold">Capture Color</Text>
      <Button 
        variant="primary" 
        onClick={activateEyedropper}
        iconLeft="colorPicker"
      >
        Activer la pipette
      </Button>
      {selectedColor && (
        <Box paddingTop="small">
          <Text>Couleur sélectionnée : {selectedColor}</Text>
          <Box 
            width="50px" 
            height="50px" 
            background={selectedColor} 
            marginTop="small"
          />
          <Button 
            variant="secondary" 
            onClick={copyToClipboard}
            iconLeft="copy"
            marginTop="small"
          >
            Copier le code
          </Button>
        </Box>
      )}
    </Box>
  );
}

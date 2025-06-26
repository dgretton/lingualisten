import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Info } from 'lucide-react';

interface DisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DisclaimerModal({ isOpen, onClose }: DisclaimerModalProps) {
  const [disclaimerText, setDisclaimerText] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDisclaimer = async () => {
      try {
        const response = await fetch('/DISCLAIMER.TXT');
        if (response.ok) {
          const text = await response.text();
          setDisclaimerText(text.trim());
        } else {
          // Fallback text if file can't be loaded
          setDisclaimerText(`Vas a probar una aplicación de aprendizaje de idiomas para hispanohablantes que están aprendiendo inglés. Está diseñada para el estudio individual mediante la interacción con un agente de inteligencia artificial.
Cada vez que la uses, es una nueva interacción y no se guardan las anteriores. Es muy sencilla y queremos mejorarla, por lo que podríamos hacerte algunas preguntas opcionales sobre tu trabajo e intereses.
No te preguntaremos tu nombre completo, ubicación, país de origen ni ningún otro dato personal.`);
        }
      } catch (error) {
        console.error('Error loading disclaimer:', error);
        // Use fallback text
        setDisclaimerText(`Vas a probar una aplicación de aprendizaje de idiomas para hispanohablantes que están aprendiendo inglés. Está diseñada para el estudio individual mediante la interacción con un agente de inteligencia artificial.
Cada vez que la uses, es una nueva interacción y no se guardan las anteriores. Es muy sencilla y queremos mejorarla, por lo que podríamos hacerte algunas preguntas opcionales sobre tu trabajo e intereses.
No te preguntaremos tu nombre completo, ubicación, país de origen ni ningún otro dato personal.`);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadDisclaimer();
    }
  }, [isOpen]);

  const parseDisclaimerText = (text: string) => {
    const paragraphs = text.split('\n').filter(p => p.trim());
    
    return paragraphs.map((paragraph, index) => {
      const trimmedParagraph = paragraph.trim();
      
      // Skip the availability disclaimer - that goes in the footer
      if (trimmedParagraph.toLowerCase().includes('no se garantiza que todas las funciones')) {
        return null;
      }
      
      // Check if this paragraph contains the privacy statement
      if (trimmedParagraph.toLowerCase().includes('no te preguntaremos tu nombre completo')) {
        return (
          <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="font-medium text-blue-900">
              {trimmedParagraph}
            </p>
          </div>
        );
      }
      
      return (
        <p key={index}>
          {trimmedParagraph}
        </p>
      );
    }).filter(Boolean);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            Información de la aplicación
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 text-sm text-gray-700">
          {loading ? (
            <p>Cargando...</p>
          ) : (
            parseDisclaimerText(disclaimerText)
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full">
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

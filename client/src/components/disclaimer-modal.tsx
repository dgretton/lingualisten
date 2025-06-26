import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { AlertTriangle } from 'lucide-react';

interface DisclaimerModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

export function DisclaimerModal({ isOpen, onAccept }: DisclaimerModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Información Importante
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 text-sm text-gray-700">
          <p>
            Vas a probar una aplicación de aprendizaje de idiomas para hispanohablantes que están aprendiendo inglés. 
            Está diseñada para el estudio individual mediante la interacción con un agente de inteligencia artificial.
          </p>
          
          <p>
            Cada vez que la uses, es una nueva interacción y no se guardan las anteriores. Es muy sencilla y queremos 
            mejorarla, por lo que podríamos hacerte algunas preguntas opcionales sobre tu trabajo e intereses.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="font-medium text-blue-900">
              *** No te preguntaremos tu nombre completo, ubicación, país de origen ni ningún otro dato personal. ***
            </p>
          </div>
          
          <p>
            No se garantiza que todas las funciones de la app funcionen siempre. La app podría dejar de estar 
            disponible o su apariencia y funciones podrían cambiar con el tiempo.
          </p>
        </div>

        <DialogFooter>
          <Button onClick={onAccept} className="w-full">
            Entiendo y quiero continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

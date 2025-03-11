import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { SpeechInput } from "./speech-input";

const formSchema = z.object({
  userName: z.string().min(1, {
    message: "Por favor ingresa tu nombre",
  }),
  topicText: z.string().min(3, {
    message: "El tema debe tener al menos 3 caracteres",
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface TopicInputStepProps {
  onSubmit: (values: { userName: string; topicText: string }) => void;
}

export function TopicInputStep({ onSubmit }: TopicInputStepProps) {
  const { toast } = useToast();
  const [speechTranscript, setSpeechTranscript] = useState("");
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userName: "",
      topicText: "",
    },
  });
  
  const handleSpeechTranscript = (transcript: string) => {
    setSpeechTranscript(transcript);
    form.setValue("topicText", transcript);
  };
  
  const handleSubmit = (values: FormValues) => {
    onSubmit({
      userName: values.userName,
      topicText: values.topicText,
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold text-slate-800 mb-4">
        ¿Sobre qué tema quieres practicar?
      </h2>
      <p className="text-slate-600 mb-6">
        Proporciona un tema en español y generaremos contenido de audio en inglés para practicar tu comprensión.
      </p>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="userName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-slate-700">
                  Tu nombre
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Nombre completo"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="topicText"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-slate-700">
                  Tema de interés (texto)
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Ejemplo: Conversaciones en restaurantes, entrevistas de trabajo, noticias sobre tecnología..."
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                    rows={3}
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          <SpeechInput onTranscriptChange={handleSpeechTranscript} />
          
          <div className="mt-8 flex justify-center">
            <button 
              type="submit"
              style={{
                backgroundColor: "#4f46e5", 
                color: "white",
                padding: "0.75rem 2rem",
                fontSize: "1.125rem",
                borderRadius: "0.5rem",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
              }}
            >
              Continuar
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "0.5rem" }}>
                <path d="M5 12h14"></path>
                <path d="m12 5 7 7-7 7"></path>
              </svg>
            </button>
          </div>
        </form>
      </Form>
    </div>
  );
}

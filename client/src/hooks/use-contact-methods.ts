import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ContactMethodsResponse {
  email: boolean;
  sms: boolean;
}

/**
 * Custom hook to check which contact methods are available
 * This allows us to dynamically adjust the UI based on what's configured
 */
export function useContactMethods() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['/api/contact-methods'],
    queryFn: async () => {
      const response = await apiRequest('/api/contact-methods');
      return response.json() as Promise<ContactMethodsResponse>;
    },
    retry: 1,
    refetchOnWindowFocus: false,
    placeholderData: { email: true, sms: false }
  });

  return {
    isLoading,
    isError,
    emailAvailable: data?.email ?? true, // Default to email available if no data
    smsAvailable: data?.sms ?? false     // Default to SMS not available if no data
  };
}
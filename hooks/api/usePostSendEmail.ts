import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";

export type SendEmailRequest = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export function useSendEmail() {
  return useMutation({
    mutationFn: async (emailData: SendEmailRequest) => {
      const res = await axios.post("/api/contact", emailData);

      if (res.status !== 200) {
        throw new Error(res.data.error || "Failed to transmit data");
      }

      return res.data;
    },
    onSuccess: () => {
      toast.success("Transmission Successful", {
        description:
          "Your message has been received by the Green-Vault terminal.",
      });
    },
    onError: (error: any) => {
      toast.error("Transmission Failed", {
        description:
          error.message || "An unexpected error occurred in the lab node.",
      });
    },
  });
}

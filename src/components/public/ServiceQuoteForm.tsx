import {
  type FormEvent,
  useState,
} from "react";

import {
  CheckCircle2,
  Loader2,
  Mail,
  MessageSquareText,
  Phone,
  RotateCcw,
  Send,
  User,
} from "lucide-react";

import {
  toast,
} from "sonner";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

import {
  Label,
} from "@/components/ui/label";

import {
  Textarea,
} from "@/components/ui/textarea";

import {
  supabase,
} from "@/integrations/supabase/client";


type ServiceQuoteFormProps = {
  serviceId: string;
  serviceTitle: string;
};


type ServiceQuoteFormState = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  subject: string;
  message: string;
  website: string;
};


type SubmitServiceQuoteResponse = {
  success?: boolean;
  message?: string;
  error?: {
    code?: string;
    message?: string;
  };
};


const buildInitialState = (
  serviceTitle: string,
): ServiceQuoteFormState => ({
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  subject:
    serviceTitle.trim().length > 0
      ? `Demande de devis — ${serviceTitle.trim()}`
      : "Demande de devis",
  message: "",
  website: "",
});


const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


const ServiceQuoteForm = ({
  serviceId,
  serviceTitle,
}: ServiceQuoteFormProps) => {
  const [
    form,
    setForm,
  ] =
    useState<ServiceQuoteFormState>(
      () =>
        buildInitialState(
          serviceTitle,
        ),
    );

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(false);

  const [
    submitted,
    setSubmitted,
  ] =
    useState(false);


  const updateField = (
    field:
      keyof ServiceQuoteFormState,
    value: string,
  ) => {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      }),
    );
  };


  const handleSubmit = async (
    event:
      FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }


    const customerName =
      form.customerName.trim();

    const customerEmail =
      form.customerEmail
        .trim()
        .toLowerCase();

    const customerPhone =
      form.customerPhone.trim();

    const subject =
      form.subject.trim();

    const message =
      form.message.trim();

    const website =
      form.website.trim();


    if (
      customerName.length < 2 ||
      customerName.length > 120
    ) {
      toast.error(
        "Veuillez renseigner un nom valide.",
      );

      return;
    }


    if (
      !customerEmail &&
      !customerPhone
    ) {
      toast.error(
        "Renseignez au moins une adresse e-mail ou un numéro de téléphone.",
      );

      return;
    }


    if (
      customerEmail &&
      (
        customerEmail.length > 254 ||
        !EMAIL_PATTERN.test(
          customerEmail,
        )
      )
    ) {
      toast.error(
        "Veuillez renseigner une adresse e-mail valide.",
      );

      return;
    }


    if (
      customerPhone.length > 40
    ) {
      toast.error(
        "Le numéro de téléphone est trop long.",
      );

      return;
    }


    if (
      subject.length > 180
    ) {
      toast.error(
        "L'objet de la demande est trop long.",
      );

      return;
    }


    if (
      message.length < 10 ||
      message.length > 5000
    ) {
      toast.error(
        "Votre message doit contenir entre 10 et 5 000 caractères.",
      );

      return;
    }


    setIsSubmitting(true);


    try {
      const {
        data,
        error,
      } =
        await supabase.functions.invoke<
          SubmitServiceQuoteResponse
        >(
          "submit-service-quote",
          {
            body: {
              service_id:
                serviceId,

              customer_name:
                customerName,

              customer_email:
                customerEmail ||
                null,

              customer_phone:
                customerPhone ||
                null,

              subject:
                subject ||
                null,

              message,

              property_id:
                null,

              website,
            },
          },
        );


      if (error) {
        throw new Error(
          error.message ||
            "Impossible d'envoyer votre demande de devis.",
        );
      }


      if (
        !data ||
        data.success !== true
      ) {
        throw new Error(
          data?.error?.message ||
            data?.message ||
            "Impossible d'envoyer votre demande de devis.",
        );
      }


      toast.success(
        data.message ||
          "Votre demande de devis a bien été transmise.",
      );


      setForm(
        buildInitialState(
          serviceTitle,
        ),
      );

      setSubmitted(true);
    }
    catch (
      submissionError:
        unknown
    ) {
      toast.error(
        submissionError instanceof
          Error
          ? submissionError.message
          : "Impossible d'envoyer votre demande de devis.",
      );
    }
    finally {
      setIsSubmitting(false);
    }
  };


  if (
    submitted
  ) {
    return (
      <div
        className="rounded-2xl border bg-muted/30 p-6 text-center"
        role="status"
        aria-live="polite"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-6 w-6 text-primary" />
        </div>

        <h3 className="mt-4 text-lg font-semibold">
          Demande envoyée
        </h3>

        <p className="mt-2 text-sm text-muted-foreground">
          Votre demande de devis a bien été transmise.
        </p>

        <p className="mt-2 text-sm text-muted-foreground">
          Notre équipe a bien reçu votre demande concernant{" "}
          <span className="font-medium text-foreground">
            « {serviceTitle} »
          </span>{" "}
          et reviendra vers vous après son étude.
        </p>

        <Button
          type="button"
          variant="outline"
          className="mt-5"
          onClick={() => {
            setForm(
              buildInitialState(
                serviceTitle,
              ),
            );

            setSubmitted(false);
          }}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Envoyer une autre demande
        </Button>
      </div>
    );
  }


  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="space-y-5"
      noValidate
    >
      <div>
        <Label
          htmlFor="service-quote-name"
          className="mb-2 flex items-center gap-2"
        >
          <User className="h-4 w-4 text-primary" />
          Nom complet *
        </Label>

        <Input
          id="service-quote-name"
          name="customer_name"
          type="text"
          autoComplete="name"
          maxLength={120}
          value={
            form.customerName
          }
          onChange={(
            event,
          ) =>
            updateField(
              "customerName",
              event.target.value,
            )
          }
          placeholder="Votre nom complet"
          disabled={
            isSubmitting
          }
          required
        />
      </div>


      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label
            htmlFor="service-quote-email"
            className="mb-2 flex items-center gap-2"
          >
            <Mail className="h-4 w-4 text-primary" />
            Adresse e-mail
          </Label>

          <Input
            id="service-quote-email"
            name="customer_email"
            type="email"
            autoComplete="email"
            maxLength={254}
            value={
              form.customerEmail
            }
            onChange={(
              event,
            ) =>
              updateField(
                "customerEmail",
                event.target.value,
              )
            }
            placeholder="votre@email.com"
            disabled={
              isSubmitting
            }
          />
        </div>


        <div>
          <Label
            htmlFor="service-quote-phone"
            className="mb-2 flex items-center gap-2"
          >
            <Phone className="h-4 w-4 text-primary" />
            Téléphone / WhatsApp
          </Label>

          <Input
            id="service-quote-phone"
            name="customer_phone"
            type="tel"
            autoComplete="tel"
            maxLength={40}
            value={
              form.customerPhone
            }
            onChange={(
              event,
            ) =>
              updateField(
                "customerPhone",
                event.target.value,
              )
            }
            placeholder="+224..."
            disabled={
              isSubmitting
            }
          />
        </div>
      </div>


      <p className="text-xs leading-5 text-muted-foreground">
        Renseignez au moins une adresse e-mail ou un numéro de téléphone.
      </p>


      <div>
        <Label
          htmlFor="service-quote-subject"
          className="mb-2"
        >
          Objet
        </Label>

        <Input
          id="service-quote-subject"
          name="subject"
          type="text"
          maxLength={180}
          value={
            form.subject
          }
          onChange={(
            event,
          ) =>
            updateField(
              "subject",
              event.target.value,
            )
          }
          disabled={
            isSubmitting
          }
        />
      </div>


      <div>
        <Label
          htmlFor="service-quote-message"
          className="mb-2 flex items-center gap-2"
        >
          <MessageSquareText className="h-4 w-4 text-primary" />
          Décrivez votre besoin *
        </Label>

        <Textarea
          id="service-quote-message"
          name="message"
          rows={6}
          minLength={10}
          maxLength={5000}
          value={
            form.message
          }
          onChange={(
            event,
          ) =>
            updateField(
              "message",
              event.target.value,
            )
          }
          placeholder="Précisez votre besoin, vos attentes, contraintes, délais ou toute information utile à l'établissement du devis..."
          disabled={
            isSubmitting
          }
          required
        />

        <p className="mt-1 text-right text-xs text-muted-foreground">
          {
            form.message.length
          }/5000
        </p>
      </div>


      <div
        aria-hidden="true"
        className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
      >
        <Label
          htmlFor="service-quote-website"
        >
          Site web
        </Label>

        <Input
          id="service-quote-website"
          name="website"
          type="text"
          autoComplete="off"
          tabIndex={-1}
          value={
            form.website
          }
          onChange={(
            event,
          ) =>
            updateField(
              "website",
              event.target.value,
            )
          }
        />
      </div>


      <div className="rounded-2xl bg-muted/50 p-4 text-xs leading-6 text-muted-foreground">
        Votre demande sera transmise à l'équipe AmImmo afin d'étudier votre
        besoin et de préparer une réponse adaptée à cette prestation.
      </div>


      <Button
        type="submit"
        size="lg"
        variant="premium"
        className="w-full"
        disabled={
          isSubmitting
        }
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Envoi en cours...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Envoyer ma demande de devis
          </>
        )}
      </Button>
    </form>
  );
};


export default ServiceQuoteForm;
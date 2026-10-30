import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Loader2,
  Plus,
  Save,
  Wrench,
} from "lucide-react";

import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Separator } from "@/components/ui/separator";

import {
  useCreateService,
  useServiceCategories,
  useUpdateService,
} from "@/hooks/use-services";

import type {
  Service,
  ServiceInsert,
  ServicePricingMode,
} from "@/types/real-estate";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
}

type ServiceFormState = {
  title: string;
  slug: string;
  category_id: string | null;
  short_description: string;
  description: string;
  cover_image_url: string;
  pricing_mode: ServicePricingMode;
  starting_price: string;
  currency: string;
  display_order: string;
};

const createDefaultForm = (): ServiceFormState => ({
  title: "",
  slug: "",
  category_id: null,
  short_description: "",
  description: "",
  cover_image_url: "",
  pricing_mode: "quote",
  starting_price: "",
  currency: "GNF",
  display_order: "0",
});

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const ServiceFormDialog = ({
  open,
  onOpenChange,
  service,
}: Props) => {
  const createService = useCreateService();
  const updateService = useUpdateService();

  const {
    data: categories = [],
    isLoading: categoriesLoading,
  } = useServiceCategories();

  const [form, setForm] =
    useState<ServiceFormState>(
      createDefaultForm(),
    );

  const [slugManuallyEdited, setSlugManuallyEdited] =
    useState(false);

  const isEditing = Boolean(service);

  const isPending =
    createService.isPending ||
    updateService.isPending;

  const requiresPrice =
    form.pricing_mode === "fixed" ||
    form.pricing_mode === "starting_from";

  const activeCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.is_active ||
          category.id === service?.category_id,
      ),
    [
      categories,
      service?.category_id,
    ],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    if (service) {
      setForm({
        title: service.title ?? "",
        slug: service.slug ?? "",
        category_id:
          service.category_id ?? null,
        short_description:
          service.short_description ?? "",
        description:
          service.description ?? "",
        cover_image_url:
          service.cover_image_url ?? "",
        pricing_mode:
          service.pricing_mode,
        starting_price:
          service.starting_price != null
            ? String(service.starting_price)
            : "",
        currency:
          service.currency || "GNF",
        display_order:
          String(
            service.display_order ?? 0,
          ),
      });

      setSlugManuallyEdited(true);

      return;
    }

    setForm(createDefaultForm());
    setSlugManuallyEdited(false);
  }, [
    open,
    service,
  ]);

  const setField = <
    K extends keyof ServiceFormState,
  >(
    key: K,
    value: ServiceFormState[K],
  ) => {
    setForm(
      (current) => ({
        ...current,
        [key]: value,
      }),
    );
  };

  const handleTitleChange = (
    title: string,
  ) => {
    setForm(
      (current) => ({
        ...current,
        title,
        slug:
          slugManuallyEdited
            ? current.slug
            : slugify(title),
      }),
    );
  };

  const handlePricingModeChange = (
    pricingMode: ServicePricingMode,
  ) => {
    setForm(
      (current) => ({
        ...current,
        pricing_mode:
          pricingMode,

        starting_price:
          pricingMode === "quote" ||
          pricingMode === "free"
            ? ""
            : current.starting_price,
      }),
    );
  };

  const handleSubmit = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    const title =
      form.title.trim();

    const slug =
      slugify(form.slug);

    if (!title) {
      toast.error(
        "Le titre de la prestation est obligatoire.",
      );

      return;
    }

    if (!slug) {
      toast.error(
        "Le slug de la prestation est obligatoire.",
      );

      return;
    }

    let startingPrice:
      | number
      | null = null;

    if (requiresPrice) {
      const parsed =
        Number(
          form.starting_price,
        );

      if (
        form.starting_price.trim() === "" ||
        !Number.isFinite(parsed) ||
        parsed < 0
      ) {
        toast.error(
          "Veuillez renseigner un prix valide.",
        );

        return;
      }

      startingPrice =
        parsed;
    }

    const displayOrder =
      Number(
        form.display_order,
      );

    if (
      !Number.isInteger(
        displayOrder,
      ) ||
      displayOrder < 0
    ) {
      toast.error(
        "L'ordre d'affichage doit être un entier positif ou nul.",
      );

      return;
    }

    const payload: ServiceInsert = {
      title,
      slug,

      category_id:
        form.category_id,

      short_description:
        form.short_description.trim() ||
        null,

      description:
        form.description.trim() ||
        null,

      cover_image_url:
        form.cover_image_url.trim() ||
        null,

      pricing_mode:
        form.pricing_mode,

      starting_price:
        startingPrice,

      currency:
        form.currency
          .trim()
          .toUpperCase() ||
        "GNF",

      display_order:
        displayOrder,

      status:
        service?.status ??
        "draft",

      published_at:
        service?.published_at ??
        null,
    };

    try {
      if (service) {
        await updateService.mutateAsync({
          id: service.id,
          ...payload,
        });

        toast.success(
          "Prestation mise à jour.",
        );
      } else {
        await createService.mutateAsync(
          payload,
        );

        toast.success(
          "Prestation créée en brouillon.",
        );
      }

      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer la prestation.",
      );
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Wrench className="h-5 w-5 text-primary" />
            </div>

            <div>
              <DialogTitle>
                {isEditing
                  ? "Modifier la prestation"
                  : "Nouvelle prestation"}
              </DialogTitle>

              <DialogDescription>
                Gérez les informations commerciales de la prestation.
                La publication se fait ensuite depuis la liste.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 pt-2"
        >
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="service-title">
                  Titre
                  <span className="text-destructive">
                    {" *"}
                  </span>
                </Label>

                <Input
                  id="service-title"
                  value={form.title}
                  onChange={(event) =>
                    handleTitleChange(
                      event.target.value,
                    )
                  }
                  placeholder="Ex : Gestion locative"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="service-slug">
                  Slug
                  <span className="text-destructive">
                    {" *"}
                  </span>
                </Label>

                <Input
                  id="service-slug"
                  value={form.slug}
                  onChange={(event) => {
                    setSlugManuallyEdited(true);

                    setField(
                      "slug",
                      slugify(
                        event.target.value,
                      ),
                    );
                  }}
                  placeholder="gestion-locative"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                Catégorie
              </Label>

              <Select
                value={
                  form.category_id ??
                  "__none__"
                }
                onValueChange={(value) =>
                  setField(
                    "category_id",
                    value === "__none__"
                      ? null
                      : value,
                  )
                }
                disabled={
                  categoriesLoading
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="__none__">
                    Sans catégorie
                  </SelectItem>

                  {activeCategories.map(
                    (category) => (
                      <SelectItem
                        key={
                          category.id
                        }
                        value={
                          category.id
                        }
                      >
                        {
                          category.name
                        }
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="service-short-description">
                Résumé
              </Label>

              <Textarea
                id="service-short-description"
                rows={2}
                value={
                  form.short_description
                }
                onChange={(event) =>
                  setField(
                    "short_description",
                    event.target.value,
                  )
                }
                placeholder="Présentation courte de la prestation"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="service-description">
                Description détaillée
              </Label>

              <Textarea
                id="service-description"
                rows={6}
                value={
                  form.description
                }
                onChange={(event) =>
                  setField(
                    "description",
                    event.target.value,
                  )
                }
                placeholder="Décrivez le contenu, les avantages et les modalités de la prestation."
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold">
              Tarification
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>
                  Mode tarifaire
                </Label>

                <Select
                  value={
                    form.pricing_mode
                  }
                  onValueChange={(
                    value,
                  ) =>
                    handlePricingModeChange(
                      value as ServicePricingMode,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="quote">
                      Sur devis
                    </SelectItem>

                    <SelectItem value="fixed">
                      Prix fixe
                    </SelectItem>

                    <SelectItem value="starting_from">
                      À partir de
                    </SelectItem>

                    <SelectItem value="free">
                      Gratuit
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="service-price">
                  Prix
                </Label>

                <Input
                  id="service-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={
                    form.starting_price
                  }
                  onChange={(event) =>
                    setField(
                      "starting_price",
                      event.target.value,
                    )
                  }
                  disabled={
                    !requiresPrice
                  }
                  required={
                    requiresPrice
                  }
                  placeholder={
                    requiresPrice
                      ? "0"
                      : "Non applicable"
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="service-currency">
                  Devise
                </Label>

                <Input
                  id="service-currency"
                  value={
                    form.currency
                  }
                  maxLength={8}
                  onChange={(event) =>
                    setField(
                      "currency",
                      event.target.value,
                    )
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="service-order">
                  Ordre d'affichage
                </Label>

                <Input
                  id="service-order"
                  type="number"
                  min={0}
                  step={1}
                  value={
                    form.display_order
                  }
                  onChange={(event) =>
                    setField(
                      "display_order",
                      event.target.value,
                    )
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label htmlFor="service-cover">
              Image de couverture
            </Label>

            <Input
              id="service-cover"
              type="url"
              value={
                form.cover_image_url
              }
              onChange={(event) =>
                setField(
                  "cover_image_url",
                  event.target.value,
                )
              }
              placeholder="https://..."
            />

            <p className="text-xs text-muted-foreground">
              URL d'image uniquement pour cette première version admin.
              La médiathèque pourra être raccordée ultérieurement.
            </p>
          </div>

          <Separator />

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                onOpenChange(false)
              }
              disabled={isPending}
            >
              Annuler
            </Button>

            <Button
              type="submit"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : isEditing ? (
                <>
                  <Save className="h-4 w-4" />
                  Enregistrer
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Créer
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceFormDialog;
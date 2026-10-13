export default function InspectionsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    États des lieux
                </h1>

                <p className="mt-1 text-sm text-muted-foreground">
                    Gérez les états des lieux d'entrée et de sortie
                    liés aux baux et aux réservations.
                </p>
            </div>

            <div className="rounded-lg border bg-card p-6">
                <h2 className="font-medium">
                    Module États des lieux
                </h2>

                <p className="mt-2 text-sm text-muted-foreground">
                    Le socle applicatif est actif. La liste métier,
                    les filtres et les actions seront ajoutés dans
                    la prochaine phase d'intégration.
                </p>
            </div>
        </div>
    );
}
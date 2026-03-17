import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ParsedItem {
  section: string;
  category: string;
  pcg_code: string;
  amount: number;
  amount_n_minus_1: number;
  confidence_score: number;
  original_label: string;
}

function getMockItems(confidence: number): ParsedItem[] {
  return [
    // Actif immobilise
    {
      section: "actif_immobilise",
      category: "Immobilisations incorporelles",
      pcg_code: "201",
      amount: 15000,
      amount_n_minus_1: 12000,
      confidence_score: confidence,
      original_label: "Frais d'etablissement",
    },
    {
      section: "actif_immobilise",
      category: "Immobilisations corporelles",
      pcg_code: "213",
      amount: 250000,
      amount_n_minus_1: 260000,
      confidence_score: confidence,
      original_label: "Constructions",
    },
    // Actif circulant
    {
      section: "actif_circulant",
      category: "Creances",
      pcg_code: "411",
      amount: 85000,
      amount_n_minus_1: 72000,
      confidence_score: confidence,
      original_label: "Clients et comptes rattaches",
    },
    {
      section: "actif_circulant",
      category: "Disponibilites",
      pcg_code: "512",
      amount: 42000,
      amount_n_minus_1: 38000,
      confidence_score: confidence,
      original_label: "Banques",
    },
    // Capitaux propres
    {
      section: "capitaux_propres",
      category: "Capital",
      pcg_code: "101",
      amount: 100000,
      amount_n_minus_1: 100000,
      confidence_score: confidence,
      original_label: "Capital social",
    },
    {
      section: "capitaux_propres",
      category: "Reserves",
      pcg_code: "106",
      amount: 45000,
      amount_n_minus_1: 35000,
      confidence_score: confidence,
      original_label: "Reserves",
    },
    // Dettes
    {
      section: "dettes",
      category: "Emprunts",
      pcg_code: "164",
      amount: 180000,
      amount_n_minus_1: 195000,
      confidence_score: confidence,
      original_label: "Emprunts aupres des etablissements de credit",
    },
    {
      section: "dettes",
      category: "Fournisseurs",
      pcg_code: "401",
      amount: 67000,
      amount_n_minus_1: 52000,
      confidence_score: confidence,
      original_label: "Fournisseurs et comptes rattaches",
    },
    // Produits d'exploitation
    {
      section: "produits_exploitation",
      category: "Chiffre d'affaires",
      pcg_code: "701",
      amount: 520000,
      amount_n_minus_1: 480000,
      confidence_score: confidence,
      original_label: "Ventes de produits finis",
    },
    {
      section: "produits_exploitation",
      category: "Autres produits",
      pcg_code: "758",
      amount: 8000,
      amount_n_minus_1: 5000,
      confidence_score: confidence,
      original_label: "Produits divers de gestion courante",
    },
    // Charges d'exploitation
    {
      section: "charges_exploitation",
      category: "Achats",
      pcg_code: "601",
      amount: 210000,
      amount_n_minus_1: 195000,
      confidence_score: confidence,
      original_label: "Achats de matieres premieres",
    },
    {
      section: "charges_exploitation",
      category: "Charges de personnel",
      pcg_code: "641",
      amount: 185000,
      amount_n_minus_1: 170000,
      confidence_score: confidence,
      original_label: "Remunerations du personnel",
    },
  ];
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { jobId, fileUrl, sourceType, balanceSheetId } = await req.json();

    console.log(
      `[parse-bilan] Processing job=${jobId} file=${fileUrl} source=${sourceType} sheet=${balanceSheetId}`
    );

    // Simulate parsing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Set confidence based on source type
    let confidence: number;
    switch (sourceType) {
      case "template":
        confidence = 98;
        break;
      case "excel_auto":
        confidence = 85;
        break;
      case "pdf_auto":
        confidence = 72;
        break;
      default:
        confidence = 75;
    }

    const items = getMockItems(confidence);

    // Build warnings
    const warnings: string[] = [];
    if (sourceType === "pdf_auto") {
      warnings.push(
        "PDF parsing may have lower accuracy. Please review extracted values carefully."
      );
      warnings.push(
        "Some line items may have been merged or split during OCR processing."
      );
    }

    // Calculate overall confidence as average of item confidence scores
    const overallConfidence =
      items.reduce((sum, item) => sum + item.confidence_score, 0) /
      items.length;

    return new Response(
      JSON.stringify({
        items,
        overallConfidence: Math.round(overallConfidence * 100) / 100,
        warnings,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Internal error in parse-bilan:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

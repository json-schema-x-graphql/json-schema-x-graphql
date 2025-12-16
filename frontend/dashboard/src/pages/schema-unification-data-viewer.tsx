import { useEffect } from "react";
import { useRouter } from "next/router";

const SchemaUnificationDataViewer = () => {
  const router = useRouter();

  useEffect(() => {
    // Perform a client-side redirect to the canonical schema viewer
    router.replace("/schema_unification-schema-viewer");
  }, [router]);

  return null;
};

export default SchemaUnificationDataViewer;

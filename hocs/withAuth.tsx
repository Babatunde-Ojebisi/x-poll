
"use client";

import { useAuth } from "@/contexts/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const withAuth = <P extends object>(
  WrappedComponent: React.ComponentType<P>
) => {
  const Wrapper = (props: P) => {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !user) {
        router.replace("/auth/signin");
      }
    }, [user, loading, router]);

    if (loading || !user) {
      return null; // Or a loading spinner
    }

    return <WrappedComponent {...props} />;
  };

  return Wrapper;
};

export default withAuth;

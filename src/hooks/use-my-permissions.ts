import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyPermissions } from "@/lib/permissions.functions";

export function useMyPermissions() {
  const fn = useServerFn(getMyPermissions);
  return useQuery({
    queryKey: ["my-permissions"],
    queryFn: () => fn(),
    staleTime: 60_000,
  });
}

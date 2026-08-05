
-- Revogar permissões públicas da função transfer_conversation_unit
-- Apenas service_role (IA/Server) e authenticated (Dashboard) podem executar
REVOKE EXECUTE ON FUNCTION public.transfer_conversation_unit(text, text, uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.transfer_conversation_unit(text, text, uuid, text) TO service_role, authenticated;

CREATE OR REPLACE FUNCTION public.append_wa_message(
  p_phone text, 
  p_message jsonb, 
  p_instance text DEFAULT NULL, 
  p_phone_number text DEFAULT NULL, 
  p_contact_name text DEFAULT NULL, 
  p_increment_unread boolean DEFAULT false, 
  p_new_status text DEFAULT NULL,
  p_customer_context jsonb DEFAULT NULL
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 DECLARE
   v_messages jsonb;
   v_limit int := 200;
   v_existing_context jsonb;
   v_new_context jsonb;
 BEGIN
   -- 1. Buscar mensagens e contexto atuais
   SELECT messages, customer_context INTO v_messages, v_existing_context
   FROM public.wa_conversas
   WHERE phone = p_phone;

   IF v_messages IS NULL OR jsonb_typeof(v_messages) <> 'array' THEN
     v_messages := '[]'::jsonb;
   END IF;
   
   IF v_existing_context IS NULL THEN
     v_existing_context := '{}'::jsonb;
   END IF;

   -- 2. Concatenar nova mensagem e limitar
   v_messages := v_messages || p_message;

   IF jsonb_array_length(v_messages) > v_limit THEN
     v_messages := (
       SELECT jsonb_agg(elem)
       FROM (
         SELECT elem
         FROM jsonb_array_elements(v_messages) AS elem
         OFFSET (jsonb_array_length(v_messages) - v_limit)
       ) AS sub
     );
   END IF;

   -- 3. Mesclar contexto se fornecido
   IF p_customer_context IS NOT NULL THEN
     v_new_context := v_existing_context || p_customer_context;
   ELSE
     v_new_context := v_existing_context;
   END IF;

   -- 4. Upsert na tabela
   INSERT INTO public.wa_conversas (
     phone, 
     messages, 
     instance, 
     phone_number, 
     contact_name, 
     unread_count, 
     status, 
     updated_at,
     customer_context
   )
   VALUES (
     p_phone, 
     v_messages, 
     p_instance, 
     p_phone_number, 
     p_contact_name, 
     CASE WHEN p_increment_unread THEN 1 ELSE 0 END, 
     COALESCE(p_new_status, 'aberta'), 
     NOW(),
     v_new_context
   )
   ON CONFLICT (phone) DO UPDATE SET
     messages = v_messages,
     updated_at = NOW(),
     instance = COALESCE(p_instance, wa_conversas.instance),
     phone_number = COALESCE(p_phone_number, wa_conversas.phone_number),
     contact_name = CASE 
       WHEN p_contact_name IS NOT NULL AND p_contact_name <> '' THEN p_contact_name 
       ELSE wa_conversas.contact_name 
     END,
     unread_count = CASE 
       WHEN p_increment_unread THEN wa_conversas.unread_count + 1 
       ELSE wa_conversas.unread_count 
     END,
     status = COALESCE(p_new_status, wa_conversas.status),
     customer_context = v_new_context;
 END;
$function$;
/**
 * GENERADO por `npm run gen:api` desde /openapi.json — no editar a mano.
 * Si un shape no cuadra, se regenera; nunca se "corrige" el tipo aquí.
 */
export interface paths {
    "/api/v1/platform/companies": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Companies */
        get: operations["list_companies_api_v1_platform_companies_get"];
        put?: never;
        /** Create Company */
        post: operations["create_company_api_v1_platform_companies_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/platform/companies/{company_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Company */
        get: operations["get_company_api_v1_platform_companies__company_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/platform/companies/{company_id}/suspend": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Suspend Company */
        post: operations["suspend_company_api_v1_platform_companies__company_id__suspend_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/platform/companies/{company_id}/activate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Activate Company */
        post: operations["activate_company_api_v1_platform_companies__company_id__activate_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/platform/companies/{company_id}/subscription/extend": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Extend Subscription */
        post: operations["extend_subscription_api_v1_platform_companies__company_id__subscription_extend_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/platform/companies/{company_id}/subscription/events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Subscription Events
         * @description Historial comercial de la empresa: altas, renovaciones (con monto y
         *     notas), suspensiones, reactivaciones y vencimientos. Distinto del
         *     `audit_log`, que es el registro de seguridad y además es tenant-scoped
         *     por RLS — un super-admin no puede leer el de otra empresa.
         */
        get: operations["list_subscription_events_api_v1_platform_companies__company_id__subscription_events_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/platform/companies/{company_id}/audit-log": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Company Audit Log
         * @description El registro de SEGURIDAD (roles, remates, anulaciones, cierres) de
         *     CUALQUIER empresa — a diferencia de `/subscription/events` (histórico
         *     COMERCIAL), que ya no tenía este hueco. `audit_log` tiene RLS forzado
         *     (CLAUDE.md regla 1), así que un super-admin con `get_tenant_db` normal
         *     nunca vería el de una empresa que no es la suya — de ahí `get_db`
         *     (bypass explícito, mismo mecanismo que ya usa este router para
         *     `/companies` y `/subscription/events`) con `company_id` siempre en el
         *     WHERE de la query, nunca confiado a RLS.
         */
        get: operations["list_company_audit_log_api_v1_platform_companies__company_id__audit_log_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/platform/plans": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Plans */
        get: operations["list_plans_api_v1_platform_plans_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/identity/users": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Users */
        get: operations["list_users_api_v1_identity_users_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/identity/invitations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Invite User */
        post: operations["invite_user_api_v1_identity_invitations_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/identity/users/{user_id}/role": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update User Role */
        patch: operations["update_user_role_api_v1_identity_users__user_id__role_patch"];
        trace?: never;
    };
    "/api/v1/identity/users/{user_id}/deactivate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Deactivate User */
        post: operations["deactivate_user_api_v1_identity_users__user_id__deactivate_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/identity/users/{user_id}/reactivate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Reactivate User */
        post: operations["reactivate_user_api_v1_identity_users__user_id__reactivate_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/identity/roles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Roles */
        get: operations["list_roles_api_v1_identity_roles_get"];
        put?: never;
        /** Create Role */
        post: operations["create_role_api_v1_identity_roles_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/identity/roles/{role_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Rename Role */
        patch: operations["rename_role_api_v1_identity_roles__role_id__patch"];
        trace?: never;
    };
    "/api/v1/identity/roles/{role_id}/permissions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Role Permissions */
        get: operations["get_role_permissions_api_v1_identity_roles__role_id__permissions_get"];
        /** Update Role Permissions */
        put: operations["update_role_permissions_api_v1_identity_roles__role_id__permissions_put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/identity/permissions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Permissions */
        get: operations["list_permissions_api_v1_identity_permissions_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/identity/users/{user_id}/recovery-link": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Generate Recovery Link
         * @description Enlace para que un usuario vuelva a poner su contraseña, SIN mandar correo.
         *
         *     Es el equivalente del "Generar enlace" de la invitación, para el otro caso:
         *     a alguien se le olvidó la contraseña. Antes eso solo se resolvía por correo,
         *     y con el SMTP incluido de Supabase —limitado a unos pocos envíos por hora—
         *     un olvido podía dejar a esa persona afuera sin que nadie pudiera ayudarla.
         *
         *     **Es una credencial de un solo uso**: quien la tenga puede cambiar esa
         *     contraseña y entrar como esa persona. Por eso exige `identity.manage_users`,
         *     queda auditado quién lo generó y para quién, y el enlace no se escribe en
         *     ningún log.
         */
        post: operations["generate_recovery_link_api_v1_identity_users__user_id__recovery_link_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Me */
        get: operations["get_me_api_v1_me_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update Me
         * @description El usuario edita su propio perfil: nombre y foto.
         *
         *     Sin `require_permission` a propósito, igual que `GET /me`: editarse a uno
         *     mismo no es gestionar usuarios. Lo que impide que esto sea un agujero es
         *     el schema — `MeUpdateIn` no acepta `role_id` ni `status`, así que no hay
         *     forma de ascenderse desde acá (eso sigue exigiendo
         *     `identity.manage_users` en `PATCH /identity/users/{id}/role`).
         *
         *     Devuelve el `MeOut` completo y ya actualizado: el front rehidrata su
         *     estado con la misma respuesta, sin un segundo `GET /me`.
         */
        patch: operations["update_me_api_v1_me_patch"];
        trace?: never;
    };
    "/api/v1/accounts/transfers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Transfers */
        get: operations["list_transfers_api_v1_accounts_transfers_get"];
        put?: never;
        /**
         * Create Transfer
         * @description Mueve plata entre dos cuentas propias — típicamente consignar en el
         *     banco el efectivo del día.
         *
         *     **No es ingreso ni egreso**: es la misma plata en otro bolsillo, así que
         *     no toca el estado de resultados. Genera dos movimientos
         *     (`transfer_out` / `transfer_in`) que los reportes excluyen del cálculo de
         *     ingresos y gastos.
         *
         *     Si el origen es la cuenta de efectivo **exige caja abierta** y baja el
         *     efectivo esperado del cierre — que es lo correcto: se consignó, ya no está
         *     en el cajón. Por eso el traslado va **antes** de cerrar: una sesión
         *     cerrada es inmutable y meterle un movimiento invalidaría un acta ya
         *     cuadrada.
         */
        post: operations["create_transfer_api_v1_accounts_transfers_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/accounts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Accounts
         * @description Cuentas con su saldo.
         *
         *     En una cuenta `settlement` (Sistecrédito) el saldo es lo que te DEBEN, no
         *     lo que tienes disponible.
         */
        get: operations["list_accounts_api_v1_accounts_get"];
        put?: never;
        /** Create Account */
        post: operations["create_account_api_v1_accounts_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/accounts/{account_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update Account */
        patch: operations["update_account_api_v1_accounts__account_id__patch"];
        trace?: never;
    };
    "/api/v1/accounts/{account_id}/settle": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Settle Account
         * @description Registra la liquidación de una cuenta por cobrar.
         *
         *     Se informa cuánto se liquidó y cuánto entró realmente; **la comisión no se
         *     digita**: es la diferencia, y se deriva. Así el sistema no puede quedar
         *     desactualizado respecto al contrato con el convenio.
         */
        post: operations["settle_account_api_v1_accounts__account_id__settle_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/accounts/{account_id}/statement": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Statement
         * @description Extracto de la cuenta: movimientos con **saldo corriente**, para
         *     conciliar contra el extracto real del banco.
         *
         *     Completa lo que 00024 dejó escrito y a medias — *"solo las cuentas `cash`
         *     entran al arqueo; el resto lleva saldo corriente y se concilia aparte"*.
         *     El saldo ya se mostraba, pero no CÓMO se llegó a él, y sin eso no hay
         *     forma de encontrar una diferencia contra el banco.
         *
         *     En cuentas de **efectivo** `has_running_balance` viene en `false` y los
         *     saldos en `null`. No es una carencia: la base del cajón se redeclara en
         *     cada apertura y no es un movimiento, así que acumular el histórico daría
         *     un número sin significado. El efectivo se verifica **contando**, en el
         *     arqueo. Sus movimientos sí se devuelven — sirven para ver qué pasó por el
         *     cajón.
         */
        get: operations["get_statement_api_v1_accounts__account_id__statement_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/company/settings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Settings */
        get: operations["get_settings_api_v1_company_settings_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update Settings */
        patch: operations["update_settings_api_v1_company_settings_patch"];
        trace?: never;
    };
    "/api/v1/company/document-templates": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Document Templates */
        get: operations["list_document_templates_api_v1_company_document_templates_get"];
        put?: never;
        /** Create Document Template */
        post: operations["create_document_template_api_v1_company_document_templates_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/company/document-templates/active": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Active Document Template */
        get: operations["get_active_document_template_api_v1_company_document_templates_active_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/company/document-templates/{template_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete Document Template */
        delete: operations["delete_document_template_api_v1_company_document_templates__template_id__delete"];
        options?: never;
        head?: never;
        /** Update Document Template */
        patch: operations["update_document_template_api_v1_company_document_templates__template_id__patch"];
        trace?: never;
    };
    "/api/v1/company/document-templates/{template_id}/activate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Activate Document Template */
        post: operations["activate_document_template_api_v1_company_document_templates__template_id__activate_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/customers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Customers */
        get: operations["list_customers_api_v1_customers_get"];
        put?: never;
        /** Create Customer */
        post: operations["create_customer_api_v1_customers_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/customers/{customer_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Customer */
        get: operations["get_customer_api_v1_customers__customer_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update Customer */
        patch: operations["update_customer_api_v1_customers__customer_id__patch"];
        trace?: never;
    };
    "/api/v1/catalogs/categories": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Categories */
        get: operations["list_categories_api_v1_catalogs_categories_get"];
        put?: never;
        /** Create Category */
        post: operations["create_category_api_v1_catalogs_categories_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/catalogs/categories/{category_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Category */
        get: operations["get_category_api_v1_catalogs_categories__category_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update Category */
        patch: operations["update_category_api_v1_catalogs_categories__category_id__patch"];
        trace?: never;
    };
    "/api/v1/catalogs/suppliers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Suppliers */
        get: operations["list_suppliers_api_v1_catalogs_suppliers_get"];
        put?: never;
        /** Create Supplier */
        post: operations["create_supplier_api_v1_catalogs_suppliers_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/catalogs/suppliers/{supplier_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Supplier */
        get: operations["get_supplier_api_v1_catalogs_suppliers__supplier_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update Supplier */
        patch: operations["update_supplier_api_v1_catalogs_suppliers__supplier_id__patch"];
        trace?: never;
    };
    "/api/v1/catalogs/suppliers/{supplier_id}/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Supplier Summary
         * @description Ficha del proveedor: cuánto se le ha comprado, cuánto se le debe, desde
         *     cuándo y cuántos productos distintos.
         *
         *     El CLIENTE tiene su ficha con historial cruzado desde el paso 4; el
         *     proveedor tenía solo un formulario de creación, así que "¿cuánto le he
         *     comprado?" no tenía respuesta aunque el dato estuviera completo.
         */
        get: operations["get_supplier_summary_api_v1_catalogs_suppliers__supplier_id__summary_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/catalogs/suppliers/{supplier_id}/purchases": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Supplier Purchases
         * @description Historial de compras a este proveedor.
         */
        get: operations["list_supplier_purchases_api_v1_catalogs_suppliers__supplier_id__purchases_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/contracts/ready-for-auction": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Ready For Auction */
        get: operations["list_ready_for_auction_api_v1_contracts_ready_for_auction_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/contracts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Contracts */
        get: operations["list_contracts_api_v1_contracts_get"];
        put?: never;
        /** Create Contract */
        post: operations["create_contract_api_v1_contracts_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/contracts/import": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Import Contract */
        post: operations["import_contract_api_v1_contracts_import_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/contracts/{contract_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Contract */
        get: operations["get_contract_api_v1_contracts__contract_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update Contract */
        patch: operations["update_contract_api_v1_contracts__contract_id__patch"];
        trace?: never;
    };
    "/api/v1/contracts/{contract_id}/payment-options": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Payment Options */
        get: operations["get_payment_options_api_v1_contracts__contract_id__payment_options_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/contracts/{contract_id}/payments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Payments */
        get: operations["list_payments_api_v1_contracts__contract_id__payments_get"];
        put?: never;
        /** Create Payment */
        post: operations["create_payment_api_v1_contracts__contract_id__payments_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/contracts/{contract_id}/settlement": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Settlement Info
         * @description Para el documento de paz y salvo. 404 si el contrato no está
         *     `status='paid'` — no tiene sentido imprimir un paz y salvo de un
         *     contrato que sigue vigente.
         */
        get: operations["get_settlement_info_api_v1_contracts__contract_id__settlement_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/contracts/{contract_id}/auction": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Auction Contract */
        post: operations["auction_contract_api_v1_contracts__contract_id__auction_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cashbox/sessions/open": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Open Session */
        post: operations["open_session_api_v1_cashbox_sessions_open_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cashbox/sessions/current": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Current Session */
        get: operations["get_current_session_api_v1_cashbox_sessions_current_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cashbox/sessions/today": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Today Session
         * @description La sesión de HOY, abierta o ya cerrada (404 si no se ha abierto).
         *
         *     Responde "¿qué pasó con la caja hoy?" con `cashbox.view`. Antes el front
         *     lo deducía de `GET /reports/closings`, que desde 00031 exige permiso de
         *     histórico — un cajero habría necesitado ver los cierres de todo el negocio
         *     para saber si ya había cerrado su propio turno.
         */
        get: operations["get_today_session_api_v1_cashbox_sessions_today_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cashbox/sessions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Sessions
         * @description Histórico de turnos. La sesión en curso sale por `/sessions/current`,
         *     que solo pide `cashbox.view`: un cajero puede operar su día sin poder
         *     revisar los cierres de días anteriores.
         */
        get: operations["list_sessions_api_v1_cashbox_sessions_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cashbox/sessions/{session_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Session
         * @description La de hoy con `cashbox.view`; la de un turno anterior exige además
         *     `cashbox.view_history` (00031).
         */
        get: operations["get_session_api_v1_cashbox_sessions__session_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cashbox/sessions/{session_id}/report": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Session Report
         * @description El acta del turno de hoy con `cashbox.view` —hace falta para cerrarlo—;
         *     la de cualquier otro exige además `cashbox.view_history`.
         */
        get: operations["get_session_report_api_v1_cashbox_sessions__session_id__report_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cashbox/sessions/{session_id}/close": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Close Session */
        post: operations["close_session_api_v1_cashbox_sessions__session_id__close_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cashbox/sessions/{session_id}/reopen": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Reopen Session */
        post: operations["reopen_session_api_v1_cashbox_sessions__session_id__reopen_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cashbox/expense-categories": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Expense Categories */
        get: operations["list_expense_categories_api_v1_cashbox_expense_categories_get"];
        put?: never;
        /** Create Expense Category */
        post: operations["create_expense_category_api_v1_cashbox_expense_categories_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cashbox/expenses": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Expenses */
        get: operations["list_expenses_api_v1_cashbox_expenses_get"];
        put?: never;
        /** Create Expense */
        post: operations["create_expense_api_v1_cashbox_expenses_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/inventory/entries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Entries
         * @description `payment_status=pending` responde "¿qué compras tengo por pagar?".
         *
         *     El dato estaba en cada fila desde 00020 —y hasta con índice parcial— pero
         *     ninguna consulta lo ofrecía, así que la pregunta no tenía respuesta en la
         *     app aunque la respuesta estuviera guardada.
         */
        get: operations["list_entries_api_v1_inventory_entries_get"];
        put?: never;
        /** Create Entry */
        post: operations["create_entry_api_v1_inventory_entries_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/inventory/entries/{entry_id}/pay": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Pay Entry
         * @description Salda una compra registrada como pendiente de pago.
         *
         *     El egreso cae en la sesión de caja abierta de HOY, no en la fecha de la
         *     compra: una sesión cerrada es inmutable y meterle un movimiento
         *     invalidaría un acta ya cuadrada. Una compra puede tener `entry_date` de la
         *     semana pasada y su pago aparecer en el cierre de hoy — la mercancía entró
         *     entonces, la plata sale ahora.
         */
        post: operations["pay_entry_api_v1_inventory_entries__entry_id__pay_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/inventory/entries/{entry_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Entry */
        get: operations["get_entry_api_v1_inventory_entries__entry_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/inventory/exits": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Exits */
        get: operations["list_exits_api_v1_inventory_exits_get"];
        put?: never;
        /** Create Exit */
        post: operations["create_exit_api_v1_inventory_exits_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/inventory/items": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Items */
        get: operations["list_items_api_v1_inventory_items_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/inventory/items/{item_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Item */
        get: operations["get_item_api_v1_inventory_items__item_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update Item */
        patch: operations["update_item_api_v1_inventory_items__item_id__patch"];
        trace?: never;
    };
    "/api/v1/inventory/items/{item_id}/publish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Publish Item */
        post: operations["publish_item_api_v1_inventory_items__item_id__publish_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/inventory/products": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Products
         * @description Inventario agrupado por producto, con el resumen de sus lotes.
         *
         *     Es la vista que responde "¿cuántas tengo para vender?" sin que el usuario
         *     tenga que sumar lotes mentalmente. El detalle por lote —con su costo y su
         *     proveedor— sale de `GET /products/{id}/lots`.
         */
        get: operations["list_products_api_v1_inventory_products_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/inventory/products/{product_id}/lots": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Product Lots
         * @description Lotes de un producto, del más antiguo al más nuevo — que es el orden en
         *     que conviene venderlos (FIFO).
         */
        get: operations["list_product_lots_api_v1_inventory_products__product_id__lots_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/inventory/products/{product_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update Product
         * @description Cambiar el precio acá lo cambia para TODOS los lotes de una vez — antes
         *     había que editar cada lote por separado, con el riesgo real de dejar uno
         *     barato por olvido. Las ventas ya hechas no se ven afectadas.
         */
        patch: operations["update_product_api_v1_inventory_products__product_id__patch"];
        trace?: never;
    };
    "/api/v1/inventory/products/{product_id}/kardex": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Product Kardex
         * @description **Kardex**: el libro auxiliar de inventario de un producto — su historia
         *     completa en una sola línea de tiempo, con saldo de unidades y de costo
         *     corriendo.
         *
         *     El dato existía; la pregunta no. Los movimientos viven en **tres tablas de
         *     líneas** (`inventory_entry_line`, `inventory_exit_line`, `sale_line`) que
         *     se consultan **hacia adelante**: dado un ingreso, qué artículos trajo.
         *     *"¿Qué pasó con este producto?"* es la dirección contraria, y no la
         *     respondía nadie.
         *
         *     Reúne cinco clases de movimiento, y **dos de ellas no existen como fila**:
         *     anular una venta y devolver un lote intacto reponen el stock pero no
         *     escriben ninguna línea inversa —solo cambian estado/cantidad—, así que se
         *     sintetizan. Sin eso el kardex mostraría una salida que nunca vuelve y su
         *     saldo no cuadraría contra el stock real.
         *
         *     **La valoración es POR LOTE, nunca promediada** (identificación específica,
         *     NIIF). Dos lotes del mismo producto comprados a precios distintos salen
         *     cada uno con el suyo — por eso `running_value` **no** se puede derivar de
         *     `running_quantity`: es la suma de lo que costó lo que queda.
         *
         *     Sin `from_date` devuelve la historia entera. Es a propósito y es lo
         *     contrario del extracto de una cuenta, que arranca en los últimos 30 días:
         *     ahí se busca conciliar el mes, acá se busca de dónde salió el saldo. El
         *     saldo se acumula **desde el primer movimiento**; lo anterior al rango se
         *     comprime en `opening_quantity`/`opening_value`.
         */
        get: operations["get_product_kardex_api_v1_inventory_products__product_id__kardex_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/inventory/products/{product_id}/purchases": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Product Purchases
         * @description Historial de compras de este producto: cuándo, a quién y a cuánto.
         *
         *     Responde "¿cómo se movió el costo?" y "¿a quién conviene comprarle?". La
         *     lista de productos ya insinuaba esto con el RANGO de costos entre lotes,
         *     pero no dejaba abrirlo: se veía que el costo se movió y no por qué.
         */
        get: operations["list_product_purchases_api_v1_inventory_products__product_id__purchases_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/inventory/transformations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Transformations
         * @description Historial de transformaciones — de la más reciente a la más vieja.
         *
         *     Fundir es la única operación donde **desaparece mercancía identificada y
         *     aparece otra distinta**. Una venta deja comprobante y un remate deja
         *     contrato; hasta acá, fundir no dejaba nada que se pudiera consultar, así
         *     que la pregunta *"¿de dónde salieron estos gramos de oro?"* no tenía
         *     respuesta dentro de la aplicación.
         *
         *     Importa por tres razones que no son técnicas:
         *
         *     · **Legal** — ese oro puede venir de la prenda de un cliente. Ante un
         *       reclamo, la cadena tiene que poder recorrerse hacia atrás.
         *     · **Contable** — el costo de lo producido salió de repartir el de lo
         *       consumido. Un costo sin forma de auditar su origen es un número sin
         *       respaldo, y es el que determina la utilidad de la venta.
         *     · **Operativa** — entraron 34 g de prendas y salieron 31,2 g de oro. Esa
         *       merma es información, y sin historial se perdía.
         *
         *     Basta `inventory.view`: es leer, no transformar.
         */
        get: operations["list_transformations_api_v1_inventory_transformations_get"];
        put?: never;
        /**
         * Create Transformation
         * @description Fundir, despiezar o armar: entran N artículos, salen M y **el costo viaja**.
         *
         *     Una sola operación para lo que en la práctica son varios usos —fundir
         *     prendas rematadas en oro, despiezar un equipo dañado, armar un combo— y
         *     lo que pase DESPUÉS con lo que sale es inventario común y corriente.
         *
         *     **El costo no se digita.** Lo que costó lo que entra es lo que cuesta lo
         *     que sale, más `extra_cost` (lo que cobró el fundidor o el técnico, que se
         *     **capitaliza**: es parte de producir el activo, no un gasto del mes).
         *
         *     **La merma se absorbe sola:** si entran 34 g de prendas y salen 31,2 g de
         *     oro, el mismo costo se reparte entre menos gramos y el costo unitario
         *     sube. Ese número es el que dice si la operación convenía.
         *
         *     Genera un egreso (`transformation`) por lo consumido y un ingreso
         *     (`transformation`) por lo producido, vinculados por el documento — así el
         *     stock se mueve por los caminos de siempre y la trazabilidad sobrevive:
         *     contrato → remate → artículo → transformación → lote nuevo.
         *
         *     Es **irreversible**: de una barra de oro no salen las tres cadenas otra vez.
         */
        post: operations["create_transformation_api_v1_inventory_transformations_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/inventory/transformations/{transformation_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Transformation */
        get: operations["get_transformation_api_v1_inventory_transformations__transformation_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/sales": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Sales
         * @description `from_date`/`to_date` acotan por `sold_at` en la zona horaria de la
         *     empresa (no UTC), mismo criterio que los reportes. Ambos opcionales e
         *     independientes — sin ellos, el comportamiento es el de siempre.
         */
        get: operations["list_sales_api_v1_sales_get"];
        put?: never;
        /** Create Sale */
        post: operations["create_sale_api_v1_sales_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/sales/{sale_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Sale */
        get: operations["get_sale_api_v1_sales__sale_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/sales/{sale_id}/void": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Void Sale */
        post: operations["void_sale_api_v1_sales__sale_id__void_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/sales/{sale_id}/returns": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Returns */
        get: operations["list_returns_api_v1_sales__sale_id__returns_get"];
        put?: never;
        /** Create Return */
        post: operations["create_return_api_v1_sales__sale_id__returns_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/sales/{sale_id}/returns/{return_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Return */
        get: operations["get_return_api_v1_sales__sale_id__returns__return_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/credit-notes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Credit Notes */
        get: operations["list_credit_notes_api_v1_credit_notes_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/credit-notes/{credit_note_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Credit Note */
        get: operations["get_credit_note_api_v1_credit_notes__credit_note_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/audit-log": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Audit Log */
        get: operations["list_audit_log_api_v1_audit_log_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/dashboard": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Dashboard */
        get: operations["get_dashboard_api_v1_reports_dashboard_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/closings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Closings
         * @description Exige `reports.view` **y** `cashbox.view_history` (00031).
         *
         *     Es el mismo dato que `GET /cashbox/sessions`, expuesto desde el módulo de
         *     reportes. Si se le quita el histórico al cajero por un lado y se le deja
         *     esta puerta abierta por el otro, el permiso no restringe nada — sería un
         *     control que se rodea escribiendo otra URL.
         */
        get: operations["list_closings_api_v1_reports_closings_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/closings-breakdown": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Closings Breakdown
         * @description Módulo × concepto × medio × cuenta × día, sumado sobre TODAS las
         *     sesiones cerradas del rango en una sola consulta — reemplaza el patrón
         *     del front de pedir `GET /cashbox/sessions/{id}/report` una vez por cada
         *     sesión del rango (hasta 90 requests para 90 días, docs/PENDIENTES_
         *     FRONTEND.md #11). Mismos dos permisos que `/closings`: es un reporte del
         *     histórico de caja.
         */
        get: operations["get_closings_breakdown_api_v1_reports_closings_breakdown_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/profit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Profit Summary
         * @description Utilidad BRUTA del período: lo que entró por ventas menos lo que
         *     costó la mercancía vendida. Responde "¿cuánto gané con lo que vendí?",
         *     que hasta ahora no tenía respuesta en ningún endpoint.
         *
         *     No descuenta gastos operativos (esos viven en caja y se reportan aparte)
         *     ni cubre el módulo de empeño, cuya rentabilidad son los intereses
         *     cobrados y no tiene costo de ventas asociado.
         */
        get: operations["get_profit_summary_api_v1_reports_profit_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/pawn-performance": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Pawn Performance
         * @description Rentabilidad del empeño: intereses cobrados sobre el capital prestado.
         *
         *     Complementa `/reports/profit`, que cubre la tienda. Son preguntas
         *     distintas: la tienda tiene costo de ventas y se mide por margen; el
         *     empeño no tiene costo de ventas y se mide por rendimiento sobre el
         *     capital inmovilizado en la cartera.
         *
         *     Los intereses salen de `contract_payment` (el documento) y no de los
         *     movimientos de caja: el desglose de caja solo cubre sesiones cerradas y
         *     no separa el descuento de interés, que acá importa porque erosiona el
         *     rendimiento.
         */
        get: operations["get_pawn_performance_api_v1_reports_pawn_performance_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/payables": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Payables
         * @description Cuentas por pagar a proveedores, con antigüedad (0-30 / 31-60 / +60).
         *
         *     Responde "¿cuánto debo, a quién, y desde hace cuánto?". Cada compra ya
         *     sabía si estaba pagada desde 00020, pero ninguna pantalla lo sumaba: el
         *     dato estaba guardado y la pregunta no tenía respuesta.
         *
         *     La antigüedad se mide desde `entry_date` (cuándo entró la mercancía), que
         *     es la fecha desde la que el proveedor cuenta el plazo — cargar hoy una
         *     factura de hace dos meses no la vuelve reciente.
         */
        get: operations["get_payables_api_v1_reports_payables_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/inventory-valuation": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Inventory Valuation
         * @description "¿Cuánta plata tengo en mercancía?" — el activo más grande del negocio.
         *
         *     Valorado **al costo**, que es lo correcto contablemente y lo que sale de la
         *     identificación específica. `retail_value` se expone aparte como referencia
         *     (qué se cobraría si se vendiera todo hoy) y NO es el valor del inventario:
         *     contar la utilidad antes de venderla es el error clásico.
         */
        get: operations["get_inventory_valuation_api_v1_reports_inventory_valuation_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/stale-inventory": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Stale Inventory
         * @description Mercancía disponible sin rotación — plata congelada en la vitrina.
         *
         *     Se mide sobre el lote disponible más ANTIGUO de cada producto: si algo
         *     entró hace un año y se repuso ayer, lo congelado es la pieza vieja, y usar
         *     la fecha nueva la escondería justo cuando más importa verla.
         */
        get: operations["get_stale_inventory_api_v1_reports_stale_inventory_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/income-statement": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Income Statement
         * @description Estado de resultados: **ingresos − costo de ventas − gastos = utilidad**.
         *
         *     Es la vista de arriba que faltaba: `/profit` cubre la tienda y
         *     `/pawn-performance` el empeño —bien separados, porque se miden distinto—
         *     pero nadie los sumaba en un solo resultado.
         *
         *     Y corrige un número equivocado: la "utilidad operativa" que mostraba
         *     `/reportes` era `ingresos − gastos` y **nunca restaba el costo de ventas**,
         *     así que sobreestimaba la ganancia por todo lo que costó la mercancía.
         *
         *     Sale de los DOCUMENTOS y no de los movimientos de caja: el desglose de
         *     caja solo cubre sesiones cerradas (faltaría lo de hoy), y una venta con
         *     Sistecrédito es ingreso aunque todavía no haya entrado la plata — el
         *     ingreso se reconoce al vender, no al cobrar.
         *
         *     Los movimientos de CAPITAL (préstamos, abonos) y la compra de inventario
         *     se devuelven aparte, fuera del resultado: prestar no es gasto y cobrar no
         *     es ganancia; comprar mercancía es convertir efectivo en activo, y se
         *     vuelve gasto cuando se vende.
         */
        get: operations["get_income_statement_api_v1_reports_income_statement_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/series": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Monthly Series
         * @description Serie mensual de ingresos operativos (interés + ventas) y gastos.
         *
         *     La gráfica de tendencia de `/reportes` se arma hoy con el desglose de caja,
         *     que solo cubre sesiones CERRADAS y está topado a 90 días por el N+1 de
         *     gastos por categoría. Esta serie sale de los DOCUMENTOS (`contract_payment`,
         *     `sale`, `expense`), así que incluye lo de hoy y no necesita ese tope.
         *
         *     Los meses sin actividad vienen en cero, no se omiten: un hueco haría que la
         *     gráfica uniera dos meses no consecutivos con una recta.
         */
        get: operations["get_monthly_series_api_v1_reports_series_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Health */
        get: operations["health_api_v1_health_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** AccountCreateIn */
        AccountCreateIn: {
            /** Name */
            name: string;
            /**
             * Type
             * @enum {string}
             */
            type: "cash" | "bank" | "settlement";
            /** Reference */
            reference?: string | null;
            /**
             * Is Default
             * @default false
             */
            is_default: boolean;
            /**
             * Opening Balance
             * @default 0
             */
            opening_balance: number | string;
        };
        /**
         * AccountOut
         * @description Una cuenta con su saldo corriente.
         *
         *     El `type` no es cosmético: decide cómo se verifica el dinero.
         *       · `cash`        se cuenta en el arqueo diario
         *       · `bank`        se concilia contra el extracto, en el ritmo del banco
         *       · `settlement`  es plata que TODAVÍA NO ESTÁ (Sistecrédito, datáfono):
         *                       alguien la debe y llegará después, y menos.
         */
        AccountOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Name */
            name: string;
            /**
             * Type
             * @enum {string}
             */
            type: "cash" | "bank" | "settlement";
            /** Reference */
            reference: string | null;
            /** Is Default */
            is_default: boolean;
            /** Active */
            active: boolean;
            /** Opening Balance */
            opening_balance: string;
            /** Balance */
            balance: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /**
         * AccountStatementOut
         * @description Extracto de una cuenta: los movimientos con saldo corriente, para
         *     conciliar contra el extracto real del banco.
         *
         *     Es la mitad que faltaba de una idea que el proyecto ya tenía escrita desde
         *     00024: *"solo las cuentas `cash` entran al arqueo — el resto lleva saldo
         *     corriente y se concilia aparte"*. El saldo estaba; el "aparte" no se había
         *     construido, así que la pantalla de Cuentas decía CUÁNTO tienes en el banco
         *     pero no CÓMO llegaste ahí — y sin eso no se puede cuadrar: si el banco
         *     dice 4.200.000 y el sistema 4.350.000, no hay dónde buscar la diferencia.
         */
        AccountStatementOut: {
            /**
             * Account Id
             * Format: uuid
             */
            account_id: string;
            /** Name */
            name: string;
            /**
             * Type
             * @enum {string}
             */
            type: "cash" | "bank" | "settlement";
            /**
             * From Date
             * Format: date
             */
            from_date: string;
            /**
             * To Date
             * Format: date
             */
            to_date: string;
            /** Opening Balance */
            opening_balance: string | null;
            /** Total In */
            total_in: string;
            /** Total Out */
            total_out: string;
            /** Closing Balance */
            closing_balance: string | null;
            /** Has Running Balance */
            has_running_balance: boolean;
            /** Lines */
            lines: components["schemas"]["StatementLineOut"][];
        };
        /**
         * AccountUpdateIn
         * @description El `type` NO se puede cambiar: define cómo se verifica el dinero y
         *     cambiarlo reinterpretaría movimientos ya registrados — una cuenta de
         *     efectivo que pasara a `bank` sacaría su saldo del arqueo sin que nadie
         *     contara nada.
         */
        AccountUpdateIn: {
            /** Name */
            name?: string | null;
            /** Reference */
            reference?: string | null;
            /** Is Default */
            is_default?: boolean | null;
            /** Active */
            active?: boolean | null;
        };
        /** AuditLogOut */
        AuditLogOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** User Id */
            user_id: string | null;
            /** Module */
            module: string;
            /** Action */
            action: string;
            /** Entity Type */
            entity_type: string;
            /** Entity Id */
            entity_id: string | null;
            /** Before */
            before: {
                [key: string]: unknown;
            } | null;
            /** After */
            after: {
                [key: string]: unknown;
            } | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /** BreakdownLineOut */
        BreakdownLineOut: {
            /** Module */
            module: string;
            /** Direction */
            direction: string;
            /** Concept */
            concept: string;
            /** Payment Method */
            payment_method: string | null;
            /**
             * Account Id
             * Format: uuid
             */
            account_id: string;
            /** Account Name */
            account_name: string;
            /** Account Type */
            account_type: string;
            /** Total */
            total: string;
        };
        /** CashboxKpisOut */
        CashboxKpisOut: {
            /** Session Open */
            session_open: boolean;
            /** Session Id */
            session_id: string | null;
            /** Opened At */
            opened_at: string | null;
            /** Opening Balance */
            opening_balance: string | null;
        };
        /** CategoryCreateIn */
        CategoryCreateIn: {
            /** Parent Id */
            parent_id?: string | null;
            /** Name */
            name: string;
            /** Code Letter */
            code_letter: string;
            /**
             * Applies To
             * @default both
             * @enum {string}
             */
            applies_to: "pawn" | "store" | "both";
            /** Default Term Months */
            default_term_months?: number | null;
            /** Arrears Window Months */
            arrears_window_months?: number | null;
            /** Max Ltv Pct */
            max_ltv_pct?: number | string | null;
        };
        /** CategoryOut */
        CategoryOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Parent Id */
            parent_id: string | null;
            /** Level */
            level: number;
            /** Name */
            name: string;
            /** Code Letter */
            code_letter: string;
            /** Applies To */
            applies_to: string;
            /** Default Term Months */
            default_term_months: number | null;
            /** Arrears Window Months */
            arrears_window_months: number | null;
            /** Max Ltv Pct */
            max_ltv_pct: string | null;
            /** Active */
            active: boolean;
        };
        /** CategoryUpdateIn */
        CategoryUpdateIn: {
            /** Name */
            name?: string | null;
            /** Code Letter */
            code_letter?: string | null;
            /** Applies To */
            applies_to?: ("pawn" | "store" | "both") | null;
            /** Default Term Months */
            default_term_months?: number | null;
            /** Arrears Window Months */
            arrears_window_months?: number | null;
            /** Max Ltv Pct */
            max_ltv_pct?: number | string | null;
            /** Active */
            active?: boolean | null;
        };
        /** ClosingHistoryOut */
        ClosingHistoryOut: {
            /**
             * Session Id
             * Format: uuid
             */
            session_id: string;
            /**
             * Session Date
             * Format: date
             */
            session_date: string;
            /** Opening Balance */
            opening_balance: string;
            /** Expected Cash */
            expected_cash: string;
            /** Counted Cash */
            counted_cash: string;
            /** Difference */
            difference: string;
            /** Difference Reason */
            difference_reason: string | null;
            /**
             * Closed By
             * Format: uuid
             */
            closed_by: string;
            /**
             * Closed At
             * Format: date-time
             */
            closed_at: string;
        };
        /** ClosingsBreakdownLineOut */
        ClosingsBreakdownLineOut: {
            /** Module */
            module: string;
            /** Direction */
            direction: string;
            /** Concept */
            concept: string;
            /** Payment Method */
            payment_method: string | null;
            /**
             * Account Id
             * Format: uuid
             */
            account_id: string;
            /** Account Name */
            account_name: string;
            /** Account Type */
            account_type: string;
            /**
             * Session Date
             * Format: date
             */
            session_date: string;
            /** Total */
            total: string;
        };
        /** ClosingsBreakdownOut */
        ClosingsBreakdownOut: {
            /** Lines */
            lines: components["schemas"]["ClosingsBreakdownLineOut"][];
        };
        /** CompanyCreateIn */
        CompanyCreateIn: {
            /** Name */
            name: string;
            /** Plan Code */
            plan_code: string;
            /**
             * Subscription Expires At
             * Format: date
             */
            subscription_expires_at: string;
            /**
             * First Admin Email
             * Format: email
             */
            first_admin_email: string;
            /** First Admin Full Name */
            first_admin_full_name: string;
            /**
             * Send Email
             * @default false
             */
            send_email: boolean;
        };
        /**
         * CompanyCreatedOut
         * @description La empresa recién creada, MÁS el enlace de su primer administrador.
         *
         *     El alta era el único camino que dependía sí o sí del correo de Supabase:
         *     invitaba al primer admin con `send_email=True` y **tiraba el enlace a la
         *     basura**. Si ese correo no llegaba —cuota agotada, spam, o un escáner que
         *     lo quemó antes— el cliente nuevo se quedaba con una empresa creada y sin
         *     forma de entrar, y nadie podía rescatarlo salvo generándole otro enlace a
         *     mano desde una empresa a la que todavía no tenía acceso.
         *
         *     Ahora vuelve acá. Es una credencial de un solo uso: solo la ve el
         *     super-admin que acaba de crear la empresa, y no se escribe en ningún log.
         */
        CompanyCreatedOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Name */
            name: string;
            /** Status */
            status: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Plan Code */
            plan_code: string | null;
            /** Plan Name */
            plan_name: string | null;
            /** Subscription Expires At */
            subscription_expires_at: string | null;
            /** Admin Invite Link */
            admin_invite_link?: string | null;
        };
        /** CompanyOut */
        CompanyOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Name */
            name: string;
            /** Status */
            status: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Plan Code */
            plan_code: string | null;
            /** Plan Name */
            plan_name: string | null;
            /** Subscription Expires At */
            subscription_expires_at: string | null;
        };
        /** CompanySettingsOut */
        CompanySettingsOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Name */
            name: string;
            /** Legal Name */
            legal_name: string | null;
            /** Tax Id */
            tax_id: string | null;
            /** Contact Email */
            contact_email: string | null;
            /** Contact Phone */
            contact_phone: string | null;
            /** Address */
            address: string | null;
            /** Logo Url */
            logo_url: string | null;
            /** Signature Url */
            signature_url: string | null;
            /** Timezone */
            timezone: string;
            /** Currency */
            currency: string;
            documents: components["schemas"]["DocumentSettingsOut"];
            /** Return Window Days */
            return_window_days: number;
        };
        /**
         * CompanySettingsUpdateIn
         * @description PATCH parcial: solo los campos presentes se escriben (`exclude_unset`),
         *     así que mandar `null` explícito SÍ borra el valor y omitirlo lo conserva.
         */
        CompanySettingsUpdateIn: {
            /** Name */
            name?: string | null;
            /** Legal Name */
            legal_name?: string | null;
            /** Tax Id */
            tax_id?: string | null;
            /** Contact Email */
            contact_email?: string | null;
            /** Contact Phone */
            contact_phone?: string | null;
            /** Address */
            address?: string | null;
            /** Logo Url */
            logo_url?: string | null;
            /** Signature Url */
            signature_url?: string | null;
            documents?: components["schemas"]["DocumentSettingsIn"] | null;
            /** Return Window Days */
            return_window_days?: number | null;
        };
        /** ContractCreateIn */
        ContractCreateIn: {
            /** Account Id */
            account_id?: string | null;
            /**
             * Customer Id
             * Format: uuid
             */
            customer_id: string;
            /** Principal */
            principal: number | string;
            /** Interest Rate Pct */
            interest_rate_pct: number | string;
            /** Appraisal Value */
            appraisal_value?: number | string | null;
            /** Items */
            items: components["schemas"]["ContractItemIn"][];
            /**
             * Payment Method
             * @enum {string}
             */
            payment_method: "cash" | "transfer" | "other";
            /**
             * Extension Months
             * @default 1
             */
            extension_months: number;
            /** Legacy Code */
            legacy_code?: string | null;
            /** Notes */
            notes?: string | null;
        };
        /**
         * ContractImportIn
         * @description docs/MIGRACION_CONTRATOS.md: importa la foto financiera al corte de
         *     un contrato del sistema anterior. A diferencia de `ContractCreateIn`,
         *     `term_months`/`arrears_window_months`/`extension_months` NO salen de la
         *     categoría: son el snapshot real del contrato viejo, y `capital_balance`
         *     puede ya ser menor que `principal` (abonos hechos antes del import).
         *     Los límites de negocio (>0, alineación de fechas, etc.) se validan en el
         *     servicio -no acá- para poder devolver los códigos de error específicos
         *     del import (`IMPORT_*`) en vez del genérico `VALIDATION_ERROR`.
         */
        ContractImportIn: {
            /** Legacy Code */
            legacy_code: string;
            /**
             * Customer Id
             * Format: uuid
             */
            customer_id: string;
            /** Principal */
            principal: number | string;
            /** Capital Balance */
            capital_balance: number | string;
            /** Interest Rate Pct */
            interest_rate_pct: number | string;
            /** Term Months */
            term_months: number;
            /** Arrears Window Months */
            arrears_window_months: number;
            /**
             * Extension Months
             * @default 1
             */
            extension_months: number;
            /**
             * Start Date
             * Format: date
             */
            start_date: string;
            /**
             * Interest Paid Until
             * Format: date
             */
            interest_paid_until: string;
            /** Items */
            items: components["schemas"]["ContractItemIn"][];
            /** Appraisal Value */
            appraisal_value?: number | string | null;
            /** Signed Photo Url */
            signed_photo_url?: string | null;
            /** Notes */
            notes?: string | null;
        };
        /** ContractItemIn */
        ContractItemIn: {
            /**
             * Category Id
             * Format: uuid
             */
            category_id: string;
            /** Description */
            description: string;
            /** Weight Grams */
            weight_grams?: number | string | null;
            /** Serial Imei */
            serial_imei?: string | null;
            /** Item Appraisal */
            item_appraisal?: number | string | null;
            /** Photos */
            photos?: string[];
        };
        /** ContractItemOut */
        ContractItemOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Category Id
             * Format: uuid
             */
            category_id: string;
            /** Description */
            description: string;
            /** Weight Grams */
            weight_grams: string | null;
            /** Serial Imei */
            serial_imei: string | null;
            /** Item Appraisal */
            item_appraisal: string | null;
            /** Status */
            status: string;
            /** Photos */
            photos: string[];
            /** Inventory Item Id */
            inventory_item_id: string | null;
        };
        /** ContractKpisOut */
        ContractKpisOut: {
            /** Active Count */
            active_count: number;
            /** In Arrears Count */
            in_arrears_count: number;
            /** In Extension Count */
            in_extension_count: number;
            /** Ready For Auction Count */
            ready_for_auction_count: number;
            /** Auctioned Count */
            auctioned_count: number;
            /** Capital Outstanding */
            capital_outstanding: string;
        };
        /** ContractOut */
        ContractOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Number */
            number: number;
            /** Legacy Code */
            legacy_code: string | null;
            /**
             * Customer Id
             * Format: uuid
             */
            customer_id: string;
            /** Principal */
            principal: string;
            /** Capital Balance */
            capital_balance: string;
            /** Appraisal Value */
            appraisal_value: string | null;
            /** Interest Rate Pct */
            interest_rate_pct: string;
            /** Term Months */
            term_months: number;
            /** Arrears Window Months */
            arrears_window_months: number;
            /** Extension Months */
            extension_months: number;
            /**
             * Start Date
             * Format: date
             */
            start_date: string;
            /**
             * Due Date
             * Format: date
             */
            due_date: string;
            /**
             * Interest Paid Until
             * Format: date
             */
            interest_paid_until: string;
            /** Status */
            status: string;
            /** Extension Ends At */
            extension_ends_at: string | null;
            /** Ltv Warning */
            ltv_warning: boolean;
            /** Notes */
            notes: string | null;
            /** Signed Photo Url */
            signed_photo_url: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Items */
            items: components["schemas"]["ContractItemOut"][];
        };
        /** ContractUpdateIn */
        ContractUpdateIn: {
            /** Appraisal Value */
            appraisal_value?: number | string | null;
            /** Notes */
            notes?: string | null;
            /** Signed Photo Url */
            signed_photo_url?: string | null;
        };
        /** CreditNoteOut */
        CreditNoteOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Number */
            number: number;
            /**
             * Customer Id
             * Format: uuid
             */
            customer_id: string;
            /**
             * Sale Return Id
             * Format: uuid
             */
            sale_return_id: string;
            /** Amount */
            amount: string;
            /** Redeemed Amount */
            redeemed_amount: string;
            /** Balance */
            balance: string;
            /** Notes */
            notes: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /** CursorPage[AuditLogOut] */
        CursorPage_AuditLogOut_: {
            /** Items */
            items: components["schemas"]["AuditLogOut"][];
            /** Next Cursor */
            next_cursor?: string | null;
        };
        /** CursorPage[ClosingHistoryOut] */
        CursorPage_ClosingHistoryOut_: {
            /** Items */
            items: components["schemas"]["ClosingHistoryOut"][];
            /** Next Cursor */
            next_cursor?: string | null;
        };
        /** CursorPage[CompanyOut] */
        CursorPage_CompanyOut_: {
            /** Items */
            items: components["schemas"]["CompanyOut"][];
            /** Next Cursor */
            next_cursor?: string | null;
        };
        /** CursorPage[ContractOut] */
        CursorPage_ContractOut_: {
            /** Items */
            items: components["schemas"]["ContractOut"][];
            /** Next Cursor */
            next_cursor?: string | null;
        };
        /** CursorPage[CreditNoteOut] */
        CursorPage_CreditNoteOut_: {
            /** Items */
            items: components["schemas"]["CreditNoteOut"][];
            /** Next Cursor */
            next_cursor?: string | null;
        };
        /** CursorPage[CustomerOut] */
        CursorPage_CustomerOut_: {
            /** Items */
            items: components["schemas"]["CustomerOut"][];
            /** Next Cursor */
            next_cursor?: string | null;
        };
        /** CursorPage[EntryOut] */
        CursorPage_EntryOut_: {
            /** Items */
            items: components["schemas"]["EntryOut"][];
            /** Next Cursor */
            next_cursor?: string | null;
        };
        /** CursorPage[ExitOut] */
        CursorPage_ExitOut_: {
            /** Items */
            items: components["schemas"]["ExitOut"][];
            /** Next Cursor */
            next_cursor?: string | null;
        };
        /** CursorPage[ExpenseOut] */
        CursorPage_ExpenseOut_: {
            /** Items */
            items: components["schemas"]["ExpenseOut"][];
            /** Next Cursor */
            next_cursor?: string | null;
        };
        /** CursorPage[ItemOut] */
        CursorPage_ItemOut_: {
            /** Items */
            items: components["schemas"]["ItemOut"][];
            /** Next Cursor */
            next_cursor?: string | null;
        };
        /** CursorPage[PaymentOut] */
        CursorPage_PaymentOut_: {
            /** Items */
            items: components["schemas"]["PaymentOut"][];
            /** Next Cursor */
            next_cursor?: string | null;
        };
        /** CursorPage[ProductOut] */
        CursorPage_ProductOut_: {
            /** Items */
            items: components["schemas"]["ProductOut"][];
            /** Next Cursor */
            next_cursor?: string | null;
        };
        /** CursorPage[SaleOut] */
        CursorPage_SaleOut_: {
            /** Items */
            items: components["schemas"]["SaleOut"][];
            /** Next Cursor */
            next_cursor?: string | null;
        };
        /** CursorPage[SessionOut] */
        CursorPage_SessionOut_: {
            /** Items */
            items: components["schemas"]["SessionOut"][];
            /** Next Cursor */
            next_cursor?: string | null;
        };
        /** CursorPage[SubscriptionEventOut] */
        CursorPage_SubscriptionEventOut_: {
            /** Items */
            items: components["schemas"]["SubscriptionEventOut"][];
            /** Next Cursor */
            next_cursor?: string | null;
        };
        /** CursorPage[SupplierOut] */
        CursorPage_SupplierOut_: {
            /** Items */
            items: components["schemas"]["SupplierOut"][];
            /** Next Cursor */
            next_cursor?: string | null;
        };
        /** CursorPage[SupplierPurchaseOut] */
        CursorPage_SupplierPurchaseOut_: {
            /** Items */
            items: components["schemas"]["SupplierPurchaseOut"][];
            /** Next Cursor */
            next_cursor?: string | null;
        };
        /** CursorPage[TransferOut] */
        CursorPage_TransferOut_: {
            /** Items */
            items: components["schemas"]["TransferOut"][];
            /** Next Cursor */
            next_cursor?: string | null;
        };
        /** CursorPage[TransformationSummaryOut] */
        CursorPage_TransformationSummaryOut_: {
            /** Items */
            items: components["schemas"]["TransformationSummaryOut"][];
            /** Next Cursor */
            next_cursor?: string | null;
        };
        /** CursorPage[UserOut] */
        CursorPage_UserOut_: {
            /** Items */
            items: components["schemas"]["UserOut"][];
            /** Next Cursor */
            next_cursor?: string | null;
        };
        /** CustomerCreateIn */
        CustomerCreateIn: {
            /** Full Name */
            full_name: string;
            /**
             * Doc Type
             * @enum {string}
             */
            doc_type: "cc" | "ce" | "passport" | "nit";
            /** Doc Number */
            doc_number: string;
            /** Doc Issue Place */
            doc_issue_place?: string | null;
            /** Address */
            address?: string | null;
            /** Phone */
            phone: string;
            /** Email */
            email?: string | null;
            /** Doc Photo Url */
            doc_photo_url?: string | null;
            /** Notes */
            notes?: string | null;
        };
        /** CustomerOut */
        CustomerOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Full Name */
            full_name: string;
            /** Doc Type */
            doc_type: string;
            /** Doc Number */
            doc_number: string;
            /** Doc Issue Place */
            doc_issue_place: string | null;
            /** Address */
            address: string | null;
            /** Phone */
            phone: string;
            /** Email */
            email: string | null;
            /** Doc Photo Url */
            doc_photo_url: string | null;
            /** Status */
            status: string;
            /** Alert Reason */
            alert_reason: string | null;
            /** Notes */
            notes: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /** CustomerUpdateIn */
        CustomerUpdateIn: {
            /** Full Name */
            full_name?: string | null;
            /** Doc Issue Place */
            doc_issue_place?: string | null;
            /** Address */
            address?: string | null;
            /** Phone */
            phone?: string | null;
            /** Email */
            email?: string | null;
            /** Doc Photo Url */
            doc_photo_url?: string | null;
            /** Notes */
            notes?: string | null;
        };
        /** DashboardOut */
        DashboardOut: {
            /**
             * As Of
             * Format: date
             */
            as_of: string;
            contracts: components["schemas"]["ContractKpisOut"];
            sales: components["schemas"]["SalesKpisOut"];
            inventory: components["schemas"]["InventoryKpisOut"];
            cashbox: components["schemas"]["CashboxKpisOut"];
        };
        /** DocumentSettingsIn */
        DocumentSettingsIn: {
            /** Header Note */
            header_note?: string | null;
            /** Footer Note */
            footer_note?: string | null;
            /** Legal Notice */
            legal_notice?: string | null;
        };
        /**
         * DocumentSettingsOut
         * @description Textos configurables de los documentos imprimibles (contrato, acta de
         *     cierre, comprobante de venta). Viven en `company.settings->documents`, no
         *     en columnas propias: son texto libre de presentación, no datos de negocio
         *     que alguien vaya a consultar o agregar.
         */
        DocumentSettingsOut: {
            /** Header Note */
            header_note?: string | null;
            /** Footer Note */
            footer_note?: string | null;
            /** Legal Notice */
            legal_notice?: string | null;
        };
        /** DocumentTemplateCreateIn */
        DocumentTemplateCreateIn: {
            /**
             * Document Type
             * @enum {string}
             */
            document_type: "contract" | "settlement";
            /** Name */
            name: string;
            /** Body */
            body: {
                [key: string]: unknown;
            };
            /**
             * Layout
             * @default classic
             * @enum {string}
             */
            layout: "classic" | "modern" | "compact";
        };
        /**
         * DocumentTemplateOut
         * @description `body` es el documento ProseMirror/Tiptap completo (JSON estructurado,
         *     nunca HTML crudo — esa es la mitigación de XSS: el renderer del frontend
         *     solo emite las etiquetas que sus nodos conocidos definen).
         */
        DocumentTemplateOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Document Type
             * @enum {string}
             */
            document_type: "contract" | "settlement";
            /** Name */
            name: string;
            /** Body */
            body: {
                [key: string]: unknown;
            };
            /**
             * Layout
             * @enum {string}
             */
            layout: "classic" | "modern" | "compact";
            /** Is Active */
            is_active: boolean;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
        };
        /** DocumentTemplateUpdateIn */
        DocumentTemplateUpdateIn: {
            /** Name */
            name?: string | null;
            /** Body */
            body?: {
                [key: string]: unknown;
            } | null;
            /** Layout */
            layout?: ("classic" | "modern" | "compact") | null;
        };
        /** EntryCreateIn */
        EntryCreateIn: {
            /**
             * Origin Type
             * @enum {string}
             */
            origin_type: "purchase" | "initial_stock" | "adjustment_in" | "other";
            /** Supplier Id */
            supplier_id?: string | null;
            /** Supplier Invoice */
            supplier_invoice?: string | null;
            /** Notes */
            notes?: string | null;
            /** Payment Method */
            payment_method?: ("cash" | "transfer" | "other") | null;
            /** Entry Date */
            entry_date?: string | null;
            /** Account Id */
            account_id?: string | null;
            /** Lines */
            lines: components["schemas"]["EntryLineIn"][];
        };
        /** EntryLineIn */
        EntryLineIn: {
            /** Name */
            name: string;
            /**
             * Cat1 Id
             * Format: uuid
             */
            cat1_id: string;
            /**
             * Cat2 Id
             * Format: uuid
             */
            cat2_id: string;
            /**
             * Cat3 Id
             * Format: uuid
             */
            cat3_id: string;
            /** Description */
            description?: string | null;
            /** Unit Cost */
            unit_cost: number | string;
            /**
             * Quantity
             * @default 1
             */
            quantity: number | string;
            /**
             * Unit
             * @default unit
             * @enum {string}
             */
            unit: "unit" | "gram" | "kilogram" | "meter" | "liter";
            /** Photos */
            photos?: string[];
            /** Sale Price */
            sale_price?: number | string | null;
        };
        /** EntryOut */
        EntryOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Number */
            number: number;
            /** Origin Type */
            origin_type: string;
            /** Supplier Id */
            supplier_id: string | null;
            /** Supplier Invoice */
            supplier_invoice: string | null;
            /** Contract Id */
            contract_id: string | null;
            /** Total Cost */
            total_cost: string;
            /** Notes */
            notes: string | null;
            /** Payment Method */
            payment_method: string | null;
            /**
             * Entry Date
             * Format: date
             */
            entry_date: string;
            /** Paid At */
            paid_at: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Items */
            items: components["schemas"]["ItemOut"][];
        };
        /** EntryPayIn */
        EntryPayIn: {
            /**
             * Payment Method
             * @enum {string}
             */
            payment_method: "cash" | "transfer" | "other";
            /** Account Id */
            account_id?: string | null;
        };
        /** ExitCreateIn */
        ExitCreateIn: {
            /**
             * Exit Type
             * @enum {string}
             */
            exit_type: "adjustment" | "damage" | "supplier_return" | "internal_use" | "loss";
            /** Reason */
            reason: string;
            /** Lines */
            lines: components["schemas"]["ExitLineIn"][];
        };
        /** ExitLineIn */
        ExitLineIn: {
            /**
             * Item Id
             * Format: uuid
             */
            item_id: string;
            /** Quantity */
            quantity: number | string;
        };
        /** ExitOut */
        ExitOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Number */
            number: number;
            /** Exit Type */
            exit_type: string;
            /** Reason */
            reason: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /** ExpenseCategoryCreateIn */
        ExpenseCategoryCreateIn: {
            /** Name */
            name: string;
        };
        /** ExpenseCategoryOut */
        ExpenseCategoryOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Name */
            name: string;
            /** Active */
            active: boolean;
        };
        /** ExpenseCreateIn */
        ExpenseCreateIn: {
            /** Account Id */
            account_id?: string | null;
            /**
             * Category Id
             * Format: uuid
             */
            category_id: string;
            /** Description */
            description: string;
            /** Amount */
            amount: number | string;
            /**
             * Payment Method
             * @enum {string}
             */
            payment_method: "cash" | "transfer" | "other";
            /**
             * Module
             * @default general
             * @enum {string}
             */
            module: "pawn" | "store" | "general";
            /** Receipt Url */
            receipt_url?: string | null;
        };
        /** ExpenseOut */
        ExpenseOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Session Id
             * Format: uuid
             */
            session_id: string;
            /** Module */
            module: string;
            /**
             * Category Id
             * Format: uuid
             */
            category_id: string;
            /** Description */
            description: string;
            /** Amount */
            amount: string;
            /** Payment Method */
            payment_method: string;
            /** Receipt Url */
            receipt_url: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /** HTTPValidationError */
        HTTPValidationError: {
            /** Detail */
            detail?: components["schemas"]["ValidationError"][];
        };
        /**
         * IncomeStatementOut
         * @description Estado de resultados del período: **¿cuánto ganó el negocio?**
         *
         *     Es la vista de arriba que faltaba. `/profit` cubre la tienda y
         *     `/pawn-performance` el empeño —correctamente separados, porque se miden
         *     distinto— pero nadie los sumaba en un solo resultado.
         *
         *     Y arregla un número que estaba MAL: la "utilidad operativa" de `/reportes`
         *     calculaba `ingresos − gastos` y **nunca restaba el costo de ventas**, así
         *     que una cadena vendida en 500.000 que costó 300.000 contaba como 500.000
         *     de utilidad. Para una tienda eso sobreestima la ganancia por todo el costo
         *     de la mercancía.
         *
         *     Sale de los DOCUMENTOS (`sale`, `contract_payment`, `expense`) y no de los
         *     movimientos de caja. Dos razones, y las dos importan:
         *
         *       · El desglose de caja solo cubre sesiones CERRADAS: lo de hoy faltaría.
         *       · Una venta con Sistecrédito ES ingreso aunque no haya entrado plata —
         *         el ingreso se reconoce al vender, no al cobrar. Armado desde caja, ese
         *         ingreso aparecería tarde o no aparecería.
         */
        IncomeStatementOut: {
            /**
             * From Date
             * Format: date
             */
            from_date: string;
            /**
             * To Date
             * Format: date
             */
            to_date: string;
            /** Sales Revenue */
            sales_revenue: string;
            /** Interest Revenue */
            interest_revenue: string;
            /** Total Revenue */
            total_revenue: string;
            /** Cost Of Goods Sold */
            cost_of_goods_sold: string;
            /** Gross Profit */
            gross_profit: string;
            /** Operating Expenses */
            operating_expenses: string;
            /** Expense Count */
            expense_count: number;
            /** Operating Profit */
            operating_profit: string;
            /** Margin Pct */
            margin_pct: string | null;
            /** Interest Discounts */
            interest_discounts: string;
            /** Capital Disbursed */
            capital_disbursed: string;
            /** Capital Recovered */
            capital_recovered: string;
            /** Inventory Purchased */
            inventory_purchased: string;
        };
        /** InventoryKpisOut */
        InventoryKpisOut: {
            /** Available Count */
            available_count: number;
            /** Available Value */
            available_value: string;
            /** Draft Count */
            draft_count: number;
        };
        /** InventoryValuationCategoryOut */
        InventoryValuationCategoryOut: {
            /** Cat1 Id */
            cat1_id: string | null;
            /** Cat1 Name */
            cat1_name: string;
            /** Units */
            units: number;
            /** Cost Value */
            cost_value: string;
            /** Retail Value */
            retail_value: string;
        };
        /**
         * InventoryValuationOut
         * @description "¿Cuánta plata tengo en mercancía?" — el activo más grande del negocio.
         *
         *     Se valora AL COSTO, que es lo correcto contablemente y lo que sale de la
         *     identificación específica: cada lote con su costo real, nunca promediado.
         *
         *     `retail_value` va aparte y es lo que se cobraría si se vendiera todo hoy.
         *     NO es el valor del inventario — contar la utilidad antes de venderla es el
         *     error clásico. Se expone porque responde otra pregunta legítima (cuánto hay
         *     en la vitrina a precio de venta) y porque la diferencia entre ambos es la
         *     utilidad que todavía no se ha realizado.
         */
        InventoryValuationOut: {
            /**
             * As Of
             * Format: date
             */
            as_of: string;
            /** Units */
            units: number;
            /** Lot Count */
            lot_count: number;
            /** Cost Value */
            cost_value: string;
            /** Retail Value */
            retail_value: string;
            /** Potential Profit */
            potential_profit: string;
            /** By Category */
            by_category: components["schemas"]["InventoryValuationCategoryOut"][];
        };
        /** InviteUserIn */
        InviteUserIn: {
            /**
             * Email
             * Format: email
             */
            email: string;
            /** Full Name */
            full_name: string;
            /**
             * Role Id
             * Format: uuid
             */
            role_id: string;
            /**
             * Send Email
             * @default true
             */
            send_email: boolean;
        };
        /**
         * InvitedUserOut
         * @description `UserOut` + el enlace, presente solo cuando se pidió sin correo.
         *
         *     Es una credencial de un solo uso: quien la tenga se convierte en ese
         *     usuario. Solo la recibe quien ya tiene `identity.manage_users`.
         */
        InvitedUserOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Full Name */
            full_name: string;
            /** Email */
            email: string;
            /**
             * Role Id
             * Format: uuid
             */
            role_id: string;
            /** Status */
            status: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Invite Link */
            invite_link?: string | null;
        };
        /** ItemOut */
        ItemOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Code */
            code: string | null;
            /** Name */
            name: string;
            /**
             * Cat1 Id
             * Format: uuid
             */
            cat1_id: string;
            /**
             * Cat2 Id
             * Format: uuid
             */
            cat2_id: string;
            /**
             * Cat3 Id
             * Format: uuid
             */
            cat3_id: string;
            /** Description */
            description: string | null;
            /** Origin */
            origin: string;
            /** Supplier Id */
            supplier_id: string | null;
            /** Source Contract Id */
            source_contract_id: string | null;
            /** Source Transformation Id */
            source_transformation_id?: string | null;
            /** Source Return Id */
            source_return_id?: string | null;
            /** Cost */
            cost: string;
            /** Sale Price */
            sale_price: string | null;
            /** Quantity */
            quantity: string;
            /** Unit */
            unit: string;
            /** Unit Abbr */
            unit_abbr: string;
            /** Status */
            status: string;
            /** Photos */
            photos: string[];
            /**
             * Entry Date
             * Format: date
             */
            entry_date: string;
            /** Product Id */
            product_id: string | null;
            /** Lot Number */
            lot_number: number | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /** ItemPublishIn */
        ItemPublishIn: {
            /** Sale Price */
            sale_price: number | string;
        };
        /**
         * ItemUpdateIn
         * @description Solo FOTOS. Desde 00022 el nombre, la descripción, la categoría y el
         *     precio pertenecen al producto y se editan con `PATCH /products/{id}`,
         *     donde el cambio aplica a todos sus lotes — que es el comportamiento
         *     correcto: dos lotes del mismo producto no pueden llamarse distinto ni
         *     costar distinto al cliente.
         *
         *     Las fotos sí son del lote: una pieza de remate tiene las suyas, y un lote
         *     puede fotografiarse aparte.
         */
        ItemUpdateIn: {
            /** Photos */
            photos?: string[] | null;
        };
        /**
         * KardexLineOut
         * @description Un movimiento del producto, con el saldo DESPUÉS de él.
         */
        KardexLineOut: {
            /**
             * Date
             * Format: date
             */
            date: string;
            /**
             * Kind
             * @enum {string}
             */
            kind: "entry" | "exit" | "sale" | "sale_void" | "sale_return";
            /** Kind Detail */
            kind_detail: string;
            /**
             * Reference Id
             * Format: uuid
             */
            reference_id: string;
            /** Reference Number */
            reference_number: number;
            /** Detail */
            detail: string | null;
            /**
             * Item Id
             * Format: uuid
             */
            item_id: string;
            /** Item Code */
            item_code: string | null;
            /** Lot Number */
            lot_number: number | null;
            /** Quantity In */
            quantity_in: string;
            /** Quantity Out */
            quantity_out: string;
            /** Unit Cost */
            unit_cost: string;
            /** Running Quantity */
            running_quantity: string;
            /** Running Value */
            running_value: string;
        };
        /**
         * KardexOut
         * @description Kardex: el libro auxiliar de inventario de un producto.
         *
         *     La historia completa en una sola línea de tiempo — cada ingreso, egreso,
         *     venta y anulación— con saldo de unidades y de costo corriendo.
         *
         *     Existía el dato y no la pregunta: los movimientos viven en TRES tablas de
         *     líneas (`inventory_entry_line`, `inventory_exit_line`, `sale_line`) que se
         *     consultan **hacia adelante** (dado un documento, qué artículos trajo).
         *     "¿Qué pasó con este producto?" es la dirección contraria, y no la
         *     respondía nadie.
         *
         *     LA VALORACIÓN ES POR LOTE. Cada movimiento se valora al costo del lote que
         *     se movió, nunca a un promedio: identificación específica (NIIF). Dos lotes
         *     del mismo producto comprados a precios distintos salen cada uno con el
         *     suyo, y por eso `running_value` no se puede derivar de `running_quantity`.
         */
        KardexOut: {
            /**
             * Product Id
             * Format: uuid
             */
            product_id: string;
            /** Name */
            name: string;
            /** Unit */
            unit: string;
            /** Unit Abbr */
            unit_abbr: string;
            /**
             * From Date
             * Format: date
             */
            from_date: string;
            /**
             * To Date
             * Format: date
             */
            to_date: string;
            /** Opening Quantity */
            opening_quantity: string;
            /** Opening Value */
            opening_value: string;
            /** Total In */
            total_in: string;
            /** Total Out */
            total_out: string;
            /** Closing Quantity */
            closing_quantity: string;
            /** Closing Value */
            closing_value: string;
            /** Lines */
            lines: components["schemas"]["KardexLineOut"][];
        };
        /** MeCompanyOut */
        MeCompanyOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Name */
            name: string;
            /** Timezone */
            timezone: string;
            /** Logo Url */
            logo_url: string | null;
            /** Signature Url */
            signature_url?: string | null;
            /** Legal Name */
            legal_name?: string | null;
            /** Tax Id */
            tax_id?: string | null;
            /** Address */
            address?: string | null;
            /** Contact Phone */
            contact_phone?: string | null;
            documents?: components["schemas"]["MeDocumentsOut"];
        };
        /** MeDocumentsOut */
        MeDocumentsOut: {
            /** Header Note */
            header_note?: string | null;
            /** Footer Note */
            footer_note?: string | null;
            /** Legal Notice */
            legal_notice?: string | null;
        };
        /** MeOut */
        MeOut: {
            user: components["schemas"]["MeUserOut"];
            company: components["schemas"]["MeCompanyOut"];
            role: components["schemas"]["MeRoleOut"];
            /** Permissions */
            permissions: string[];
            subscription: components["schemas"]["MeSubscriptionOut"];
            plan: components["schemas"]["MePlanOut"];
        };
        /** MePlanOut */
        MePlanOut: {
            /** Code */
            code: string;
            /** Name */
            name: string;
        };
        /** MeRoleOut */
        MeRoleOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Name */
            name: string;
        };
        /** MeSubscriptionOut */
        MeSubscriptionOut: {
            /** Status */
            status: string;
            /**
             * Expires At
             * Format: date
             */
            expires_at: string;
        };
        /**
         * MeUpdateIn
         * @description Lo que un usuario puede cambiar DE SÍ MISMO, sin permisos de
         *     identidad: su nombre y su foto. Nada más.
         *
         *     Fuera a propósito: `email` es la identidad de Supabase Auth y cambiarlo
         *     es un flujo aparte (verificación incluida); `role_id`/`status` son
         *     gestión de identidad y exigen `identity.manage_users` — si se pudieran
         *     tocar acá, cualquiera se ascendería a admin editando su perfil.
         *
         *     PATCH parcial (`exclude_unset`): omitir un campo lo conserva, mandar
         *     `null` explícito en `photo_url` borra la foto.
         */
        MeUpdateIn: {
            /** Full Name */
            full_name?: string | null;
            /** Photo Url */
            photo_url?: string | null;
        };
        /** MeUserOut */
        MeUserOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Full Name */
            full_name: string;
            /** Email */
            email: string;
            /** Photo Url */
            photo_url?: string | null;
        };
        /**
         * MonthlySeriesOut
         * @description Serie mensual para la gráfica de tendencia del dashboard/reportes.
         *
         *     Incluye los meses sin actividad en cero — un mes faltante haría que la
         *     gráfica uniera dos meses no consecutivos con una recta y mostrara una
         *     tendencia que nunca existió.
         */
        MonthlySeriesOut: {
            /** Months */
            months: number;
            /** Points */
            points: components["schemas"]["MonthlySeriesPointOut"][];
        };
        /**
         * MonthlySeriesPointOut
         * @description Un mes de la serie histórica. `month` es el PRIMER día del mes, en la
         *     zona horaria de la empresa.
         */
        MonthlySeriesPointOut: {
            /**
             * Month
             * Format: date
             */
            month: string;
            /** Interest Revenue */
            interest_revenue: string;
            /** Sales Revenue */
            sales_revenue: string;
            /** Expenses */
            expenses: string;
        };
        /**
         * PawnPerformanceOut
         * @description Rentabilidad del EMPEÑO. Es una pregunta distinta a la de tienda: no hay
         *     costo de ventas, la rentabilidad son los intereses cobrados sobre el
         *     capital prestado — rendimiento sobre capital, no margen sobre costo.
         */
        PawnPerformanceOut: {
            /**
             * From Date
             * Format: date
             */
            from_date: string;
            /**
             * To Date
             * Format: date
             */
            to_date: string;
            /** Interest Collected */
            interest_collected: string;
            /** Interest Discounts */
            interest_discounts: string;
            /** Capital Recovered */
            capital_recovered: string;
            /** Capital Disbursed */
            capital_disbursed: string;
            /** Payment Count */
            payment_count: number;
            /** Contracts Opened */
            contracts_opened: number;
            /** Capital Outstanding */
            capital_outstanding: string;
            /** Open Contracts */
            open_contracts: number;
            /** Yield On Current Portfolio Pct */
            yield_on_current_portfolio_pct: string | null;
        };
        /**
         * PayablesOut
         * @description Cuentas por pagar: "¿cuánto debo, a quién, y desde hace cuánto?".
         *
         *     Es el primer reporte que pediría un contador y no existía, aunque cada
         *     compra ya sabía si estaba pagada: el dato estaba guardado y ninguna
         *     pantalla lo sumaba.
         */
        PayablesOut: {
            /**
             * As Of
             * Format: date
             */
            as_of: string;
            /** Total */
            total: string;
            /** Entry Count */
            entry_count: number;
            /** Days 0 30 */
            days_0_30: string;
            /** Days 31 60 */
            days_31_60: string;
            /** Days Over 60 */
            days_over_60: string;
            /** By Supplier */
            by_supplier: components["schemas"]["SupplierPayableOut"][];
        };
        /** PaymentCreateIn */
        PaymentCreateIn: {
            /** Account Id */
            account_id?: string | null;
            /** Months Covered */
            months_covered: number;
            /** Capital Amount */
            capital_amount?: number | string | null;
            /**
             * Payment Method
             * @enum {string}
             */
            payment_method: "cash" | "transfer" | "other";
            /** Discount Amount */
            discount_amount?: number | string | null;
            /** Discount Reason */
            discount_reason?: string | null;
        };
        /** PaymentOptionOut */
        PaymentOptionOut: {
            /** Months */
            months: number;
            /** Interest Amount */
            interest_amount: string;
            /** Total */
            total: string;
            /** Allows Capital */
            allows_capital: boolean;
        };
        /** PaymentOut */
        PaymentOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Receipt Number */
            receipt_number: number;
            /**
             * Paid At
             * Format: date-time
             */
            paid_at: string;
            /** Months Covered */
            months_covered: number;
            /** Interest Amount */
            interest_amount: string;
            /** Capital Amount */
            capital_amount: string;
            /** Discount Amount */
            discount_amount: string;
            /** Discount Reason */
            discount_reason: string | null;
            /** Payment Method */
            payment_method: string;
            /** Total */
            total: string;
            /** New Capital Balance */
            new_capital_balance: string;
            /**
             * New Interest Paid Until
             * Format: date
             */
            new_interest_paid_until: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /** PaymentQuoteOut */
        PaymentQuoteOut: {
            /** Months Owed */
            months_owed: number;
            /** Monthly Interest */
            monthly_interest: string;
            /** Options */
            options: components["schemas"]["PaymentOptionOut"][];
        };
        /** PermissionOut */
        PermissionOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Code */
            code: string;
            /** Module */
            module: string;
            /** Action */
            action: string;
            /** Is Special */
            is_special: boolean;
            /** Description */
            description: string | null;
        };
        /** PlanOut */
        PlanOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Name */
            name: string;
            /** Code */
            code: string;
            /** Price */
            price: string | null;
            /** Modules */
            modules: {
                [key: string]: boolean;
            };
            /** Active */
            active: boolean;
        };
        /**
         * ProductOut
         * @description Un producto con el resumen de sus lotes — la vista agrupada del
         *     inventario. El PRECIO vive acá (aplica a todos los lotes); el COSTO no
         *     sube nunca a este nivel: cada lote conserva el suyo (identificación
         *     específica, NIIF) y por eso acá solo se expone el RANGO, como lectura
         *     informativa y jamás como valor de costeo.
         */
        ProductOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Code */
            code: string | null;
            /** Name */
            name: string;
            /**
             * Cat1 Id
             * Format: uuid
             */
            cat1_id: string;
            /**
             * Cat2 Id
             * Format: uuid
             */
            cat2_id: string;
            /**
             * Cat3 Id
             * Format: uuid
             */
            cat3_id: string;
            /** Description */
            description: string | null;
            /** Sale Price */
            sale_price: string | null;
            /** Is Unique */
            is_unique: boolean;
            /** Active */
            active: boolean;
            /** Lot Count */
            lot_count: number;
            /** Available Quantity */
            available_quantity: string;
            /** Unit */
            unit: string;
            /** Unit Abbr */
            unit_abbr: string;
            /** Min Cost */
            min_cost: string | null;
            /** Max Cost */
            max_cost: string | null;
            /** Photos */
            photos: string[];
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /**
         * ProductPurchaseOut
         * @description Una compra de ESTE producto: cuándo, a quién y a cuánto.
         *
         *     Responde las dos preguntas que la lista de productos solo insinúa al
         *     mostrar el rango de costos entre lotes: **cómo se movió el costo** y **a
         *     quién conviene comprarle**. El dato estaba completo en la base y no había
         *     forma de abrirlo.
         */
        ProductPurchaseOut: {
            /**
             * Entry Id
             * Format: uuid
             */
            entry_id: string;
            /** Entry Number */
            entry_number: number;
            /**
             * Entry Date
             * Format: date
             */
            entry_date: string;
            /** Supplier Id */
            supplier_id: string | null;
            /** Supplier Name */
            supplier_name: string | null;
            /** Quantity */
            quantity: string;
            /** Unit Cost */
            unit_cost: string;
            /** Total Cost */
            total_cost: string;
            /** Lot Code */
            lot_code: string | null;
            /** Paid At */
            paid_at: string | null;
        };
        /**
         * ProductUpdateIn
         * @description Editar el producto afecta a TODOS sus lotes a la vez — ese es el punto.
         *     El costo no está acá y nunca lo estará: pertenece al lote.
         */
        ProductUpdateIn: {
            /** Name */
            name?: string | null;
            /** Description */
            description?: string | null;
            /** Sale Price */
            sale_price?: number | string | null;
            /** Active */
            active?: boolean | null;
            /** Photos */
            photos?: string[] | null;
            /** Unit */
            unit?: ("unit" | "gram" | "kilogram" | "meter" | "liter") | null;
        };
        /**
         * ProfitSummaryOut
         * @description Utilidad BRUTA (ingreso por ventas − costo de ventas). NO es la
         *     utilidad neta: no descuenta gastos operativos, que viven en caja y ya se
         *     reportan aparte en /reportes. Y cubre solo el módulo Tienda — la
         *     rentabilidad del empeño son los intereses cobrados, que no tienen costo de
         *     ventas asociado.
         */
        ProfitSummaryOut: {
            /**
             * From Date
             * Format: date
             */
            from_date: string;
            /**
             * To Date
             * Format: date
             */
            to_date: string;
            /** Sale Count */
            sale_count: number;
            /** Units Sold */
            units_sold: number;
            /** Gross Revenue */
            gross_revenue: string;
            /** Discounts */
            discounts: string;
            /** Net Revenue */
            net_revenue: string;
            /** Cost Of Goods Sold */
            cost_of_goods_sold: string;
            /** Gross Profit */
            gross_profit: string;
            /** Margin Pct */
            margin_pct: string | null;
        };
        /**
         * RecoveryLinkOut
         * @description Enlace de recuperación de contraseña, para entregar a mano.
         *
         *     Misma naturaleza que `invite_link`: es una credencial de un solo uso —
         *     quien la tenga puede cambiar esa contraseña y entrar como esa persona.
         */
        RecoveryLinkOut: {
            /**
             * User Id
             * Format: uuid
             */
            user_id: string;
            /** Email */
            email: string;
            /** Recovery Link */
            recovery_link: string;
        };
        /** RoleCreateIn */
        RoleCreateIn: {
            /** Name */
            name: string;
            /** Description */
            description?: string | null;
            /** Clone From Role Id */
            clone_from_role_id?: string | null;
        };
        /** RoleOut */
        RoleOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Name */
            name: string;
            /** Description */
            description: string | null;
            /** Is Seed */
            is_seed: boolean;
            /** Active */
            active: boolean;
            /**
             * Permission Count
             * @default 0
             */
            permission_count: number;
        };
        /** RolePermissionsIn */
        RolePermissionsIn: {
            /** Permission Codes */
            permission_codes: string[];
        };
        /** RoleRenameIn */
        RoleRenameIn: {
            /** Name */
            name: string;
            /** Description */
            description?: string | null;
        };
        /** SaleCreateIn */
        SaleCreateIn: {
            /** Account Id */
            account_id?: string | null;
            /** Customer Id */
            customer_id?: string | null;
            /**
             * Payment Method
             * @enum {string}
             */
            payment_method: "cash" | "transfer" | "other";
            /** Lines */
            lines: components["schemas"]["SaleLineIn"][];
            /** Discount Amount */
            discount_amount?: number | string | null;
            /** Discount Reason */
            discount_reason?: string | null;
            /** Credit Note Id */
            credit_note_id?: string | null;
            /** Credit Note Amount */
            credit_note_amount?: number | string | null;
        };
        /** SaleLineIn */
        SaleLineIn: {
            /**
             * Item Id
             * Format: uuid
             */
            item_id: string;
            /** Quantity */
            quantity: number | string;
            /** Unit Price */
            unit_price: number | string;
        };
        /** SaleLineOut */
        SaleLineOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Item Id
             * Format: uuid
             */
            item_id: string;
            /** Quantity */
            quantity: string;
            /** Unit Price */
            unit_price: string;
            /** Unit Cost */
            unit_cost: string;
            /** Subtotal */
            subtotal: string;
        };
        /** SaleOut */
        SaleOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Number */
            number: number;
            /**
             * Sold At
             * Format: date-time
             */
            sold_at: string;
            /** Customer Id */
            customer_id: string | null;
            /** Discount Amount */
            discount_amount: string;
            /** Total */
            total: string;
            /** Payment Method */
            payment_method: string;
            /** Status */
            status: string;
            /** Void Reason */
            void_reason: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Lines */
            lines: components["schemas"]["SaleLineOut"][];
            /** Account Id */
            account_id: string | null;
            /** Credit Note Redeemed Amount */
            credit_note_redeemed_amount?: string | null;
        };
        /** SaleReturnCreateIn */
        SaleReturnCreateIn: {
            /** Lines */
            lines: components["schemas"]["SaleReturnLineIn"][];
            /**
             * Reason
             * @enum {string}
             */
            reason: "defect" | "change_of_mind" | "other";
            /**
             * Settlement Method
             * @enum {string}
             */
            settlement_method: "cash" | "credit_note";
            /** Customer Id */
            customer_id?: string | null;
            /** Notes */
            notes?: string | null;
        };
        /** SaleReturnLineIn */
        SaleReturnLineIn: {
            /**
             * Sale Line Id
             * Format: uuid
             */
            sale_line_id: string;
            /** Quantity */
            quantity: number | string;
            /**
             * Restock
             * @default true
             */
            restock: boolean;
        };
        /** SaleReturnLineOut */
        SaleReturnLineOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Sale Line Id
             * Format: uuid
             */
            sale_line_id: string;
            /** Item Id */
            item_id: string | null;
            /** Quantity */
            quantity: string;
            /** Unit Cost */
            unit_cost: string;
            /** Restock */
            restock: boolean;
        };
        /** SaleReturnOut */
        SaleReturnOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Number */
            number: number;
            /**
             * Sale Id
             * Format: uuid
             */
            sale_id: string;
            /** Customer Id */
            customer_id: string | null;
            /** Reason */
            reason: string;
            /** Settlement Method */
            settlement_method: string;
            /** Notes */
            notes: string | null;
            /**
             * Return Date
             * Format: date
             */
            return_date: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Lines */
            lines: components["schemas"]["SaleReturnLineOut"][];
            /** Credit Note Id */
            credit_note_id: string | null;
            /** Total Amount */
            total_amount: string;
            /** Time Limit Warning */
            time_limit_warning: boolean;
        };
        /** SalesKpisOut */
        SalesKpisOut: {
            /** Today Total */
            today_total: string;
            /** Today Count */
            today_count: number;
            /** Month Total */
            month_total: string;
        };
        /** SessionCloseIn */
        SessionCloseIn: {
            /** Counted Cash */
            counted_cash: number | string;
            /** Difference Reason */
            difference_reason?: string | null;
        };
        /** SessionOpenIn */
        SessionOpenIn: {
            /** Opening Balance */
            opening_balance: number | string;
        };
        /** SessionOut */
        SessionOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Register Id
             * Format: uuid
             */
            register_id: string;
            /**
             * Session Date
             * Format: date
             */
            session_date: string;
            /**
             * Opened By
             * Format: uuid
             */
            opened_by: string;
            /**
             * Opened At
             * Format: date-time
             */
            opened_at: string;
            /** Opening Balance */
            opening_balance: string;
            /** Expected Cash */
            expected_cash: string | null;
            /** Counted Cash */
            counted_cash: string | null;
            /** Difference */
            difference: string | null;
            /** Difference Reason */
            difference_reason: string | null;
            /** Closed By */
            closed_by: string | null;
            /** Closed At */
            closed_at: string | null;
            /** Status */
            status: string;
        };
        /** SessionReopenIn */
        SessionReopenIn: {
            /** Reason */
            reason: string;
        };
        /** SessionReportOut */
        SessionReportOut: {
            /**
             * Session Id
             * Format: uuid
             */
            session_id: string;
            /** Status */
            status: string;
            /** Opening Balance */
            opening_balance: string;
            /** Expected Cash */
            expected_cash: string;
            /** Lines */
            lines: components["schemas"]["BreakdownLineOut"][];
        };
        /**
         * SettlementIn
         * @description Liquidación de una cuenta por cobrar (Sistecrédito).
         *
         *     Solo se pide lo que EFECTIVAMENTE entró y a dónde. La comisión no se
         *     configura ni se digita: es la diferencia contra lo que estaba por cobrar,
         *     así que el sistema no puede quedar desactualizado respecto al contrato.
         */
        SettlementIn: {
            /**
             * To Account Id
             * Format: uuid
             */
            to_account_id: string;
            /** Amount Received */
            amount_received: number | string;
            /** Amount Settled */
            amount_settled: number | string;
            /** Notes */
            notes?: string | null;
        };
        /**
         * SettlementInfoOut
         * @description Para el documento de paz y salvo — `settled_at` se deriva del abono
         *     que saldó el contrato (`new_capital_balance=0`), nunca una columna
         *     guardada aparte.
         */
        SettlementInfoOut: {
            /**
             * Settled At
             * Format: date-time
             */
            settled_at: string;
            /** Receipt Number */
            receipt_number: number;
        };
        /** SettlementOut */
        SettlementOut: {
            /** Settled */
            settled: string;
            /** Received */
            received: string;
            /** Commission */
            commission: string;
            /** Commission Pct */
            commission_pct: string | null;
            /** New Pending Balance */
            new_pending_balance: string;
        };
        /**
         * StaleInventoryOut
         * @description Mercancía disponible que lleva mucho sin moverse — plata congelada en la
         *     vitrina, y la base de cualquier decisión de descuento o remate.
         */
        StaleInventoryOut: {
            /**
             * As Of
             * Format: date
             */
            as_of: string;
            /** Threshold Days */
            threshold_days: number;
            /** Product Count */
            product_count: number;
            /** Total Cost Value */
            total_cost_value: string;
            /** Items */
            items: components["schemas"]["StaleItemOut"][];
        };
        /** StaleItemOut */
        StaleItemOut: {
            /**
             * Product Id
             * Format: uuid
             */
            product_id: string;
            /** Product Code */
            product_code: string | null;
            /** Product Name */
            product_name: string;
            /** Units */
            units: number;
            /** Cost Value */
            cost_value: string;
            /** Days In Stock */
            days_in_stock: number;
        };
        /** StatementLineOut */
        StatementLineOut: {
            /**
             * Movement Id
             * Format: uuid
             */
            movement_id: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Module */
            module: string;
            /** Concept */
            concept: string;
            /** Direction */
            direction: string;
            /** Amount */
            amount: string;
            /** Payment Method */
            payment_method: string | null;
            /** Notes */
            notes: string | null;
            /** Reference Type */
            reference_type: string | null;
            /** Reference Id */
            reference_id: string | null;
            /** Running Balance */
            running_balance: string | null;
        };
        /** SubscriptionEventOut */
        SubscriptionEventOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Event Type */
            event_type: string;
            /** Previous Expires At */
            previous_expires_at: string | null;
            /** New Expires At */
            new_expires_at: string | null;
            /** Amount */
            amount: string | null;
            /** Notes */
            notes: string | null;
            /** Created By */
            created_by: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /** SubscriptionExtendIn */
        SubscriptionExtendIn: {
            /**
             * New Expires At
             * Format: date
             */
            new_expires_at: string;
            /** Notes */
            notes?: string | null;
            /** Amount */
            amount?: number | string | null;
        };
        /** SupplierCreateIn */
        SupplierCreateIn: {
            /** Name */
            name: string;
            /** Doc Type */
            doc_type?: ("cc" | "ce" | "passport" | "nit") | null;
            /** Doc Number */
            doc_number?: string | null;
            /** Phone */
            phone?: string | null;
            /** Email */
            email?: string | null;
            /** Address */
            address?: string | null;
            /** Code Letter */
            code_letter: string;
            /** Notes */
            notes?: string | null;
        };
        /** SupplierOut */
        SupplierOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Name */
            name: string;
            /** Doc Type */
            doc_type: string | null;
            /** Doc Number */
            doc_number: string | null;
            /** Phone */
            phone: string | null;
            /** Email */
            email: string | null;
            /** Address */
            address: string | null;
            /** Code Letter */
            code_letter: string;
            /** Notes */
            notes: string | null;
            /** Active */
            active: boolean;
        };
        /**
         * SupplierPayableOut
         * @description Lo que se le debe a UN proveedor, con antigüedad.
         *
         *     La antigüedad se mide desde `entry_date` (cuándo ENTRÓ la mercancía), no
         *     desde cuándo se digitó: es la fecha que le importa al proveedor y la que
         *     determina si una deuda está vencida.
         */
        SupplierPayableOut: {
            /** Supplier Id */
            supplier_id: string | null;
            /** Supplier Name */
            supplier_name: string;
            /** Entry Count */
            entry_count: number;
            /** Total */
            total: string;
            /** Days 0 30 */
            days_0_30: string;
            /** Days 31 60 */
            days_31_60: string;
            /** Days Over 60 */
            days_over_60: string;
            /** Oldest Entry Date */
            oldest_entry_date: string | null;
        };
        /**
         * SupplierPurchaseOut
         * @description Una compra a este proveedor, en su ficha.
         */
        SupplierPurchaseOut: {
            /**
             * Entry Id
             * Format: uuid
             */
            entry_id: string;
            /** Number */
            number: number;
            /**
             * Entry Date
             * Format: date
             */
            entry_date: string;
            /** Supplier Invoice */
            supplier_invoice: string | null;
            /** Total Cost */
            total_cost: string;
            /** Item Count */
            item_count: number;
            /** Paid At */
            paid_at: string | null;
        };
        /**
         * SupplierSummaryOut
         * @description Ficha del proveedor: qué le he comprado y cuánto le debo.
         *
         *     El CLIENTE ya tenía su ficha con historial cruzado desde el paso 4; el
         *     proveedor tenía un formulario de creación y nada más. Sin esto no había
         *     forma de responder "¿cuánto le he comprado?" ni "¿le debo algo?" aunque el
         *     dato estuviera completo en la base.
         */
        SupplierSummaryOut: {
            /**
             * Supplier Id
             * Format: uuid
             */
            supplier_id: string;
            /** Name */
            name: string;
            /** Code Letter */
            code_letter: string;
            /** Purchase Count */
            purchase_count: number;
            /** Total Purchased */
            total_purchased: string;
            /** Pending Count */
            pending_count: number;
            /** Pending Total */
            pending_total: string;
            /** First Purchase Date */
            first_purchase_date: string | null;
            /** Last Purchase Date */
            last_purchase_date: string | null;
            /** Product Count */
            product_count: number;
        };
        /** SupplierUpdateIn */
        SupplierUpdateIn: {
            /** Name */
            name?: string | null;
            /** Doc Type */
            doc_type?: ("cc" | "ce" | "passport" | "nit") | null;
            /** Doc Number */
            doc_number?: string | null;
            /** Phone */
            phone?: string | null;
            /** Email */
            email?: string | null;
            /** Address */
            address?: string | null;
            /** Code Letter */
            code_letter?: string | null;
            /** Notes */
            notes?: string | null;
            /** Active */
            active?: boolean | null;
        };
        /**
         * TransferIn
         * @description Traslado entre dos cuentas propias — típicamente consignar el efectivo
         *     del día en el banco.
         *
         *     No es ingreso ni egreso: es la misma plata en otro bolsillo. No hay
         *     comisión ni monto "recibido" distinto del enviado, y ahí está la
         *     diferencia con una liquidación: en una liquidación llega MENOS porque el
         *     convenio cobra; en un traslado llega exactamente lo que salió, porque
         *     ambas cuentas son de la empresa.
         */
        TransferIn: {
            /**
             * From Account Id
             * Format: uuid
             */
            from_account_id: string;
            /**
             * To Account Id
             * Format: uuid
             */
            to_account_id: string;
            /** Amount */
            amount: number | string;
            /** Transfer Date */
            transfer_date?: string | null;
            /** Notes */
            notes?: string | null;
        };
        /** TransferOut */
        TransferOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Number */
            number: number;
            /**
             * From Account Id
             * Format: uuid
             */
            from_account_id: string;
            /** From Account Name */
            from_account_name: string;
            /**
             * To Account Id
             * Format: uuid
             */
            to_account_id: string;
            /** To Account Name */
            to_account_name: string;
            /** Amount */
            amount: string;
            /**
             * Transfer Date
             * Format: date
             */
            transfer_date: string;
            /** Notes */
            notes: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** From Balance */
            from_balance: string;
            /** To Balance */
            to_balance: string;
        };
        /**
         * TransformationCreateIn
         * @description Fundir, despiezar o armar: entran N artículos y salen M.
         *
         *     El costo de lo que sale es el de lo que entró más `extra_cost`. No se
         *     digita en ninguna parte, y ese es el punto: el costo VIAJA.
         */
        TransformationCreateIn: {
            /** Inputs */
            inputs: components["schemas"]["TransformationInputLineIn"][];
            /** Outputs */
            outputs: components["schemas"]["TransformationOutputLineIn"][];
            /**
             * Extra Cost
             * @default 0
             */
            extra_cost: number | string;
            /** Payment Method */
            payment_method?: ("cash" | "transfer" | "other") | null;
            /** Account Id */
            account_id?: string | null;
            /** Transform Date */
            transform_date?: string | null;
            /** Reason */
            reason: string;
            /** Notes */
            notes?: string | null;
        };
        /**
         * TransformationInputLineIn
         * @description Un artículo que se CONSUME. Deja de existir como tal.
         */
        TransformationInputLineIn: {
            /**
             * Item Id
             * Format: uuid
             */
            item_id: string;
            /** Quantity */
            quantity: number | string;
        };
        /** TransformationOut */
        TransformationOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Number */
            number: number;
            /**
             * Transform Date
             * Format: date
             */
            transform_date: string;
            /** Extra Cost */
            extra_cost: string;
            /** Notes */
            notes: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Total Cost */
            total_cost: string;
            /** Consumed */
            consumed: components["schemas"]["ItemOut"][];
            /** Produced */
            produced: components["schemas"]["ItemOut"][];
        };
        /**
         * TransformationOutputLineIn
         * @description Un artículo que se PRODUCE.
         *
         *     Es una línea de ingreso sin costo: el costo no se digita, se hereda de lo
         *     consumido. Digitarlo sería justamente el error que esta operación viene a
         *     evitar — inventar costo o perderlo por el camino.
         */
        TransformationOutputLineIn: {
            /** Name */
            name: string;
            /**
             * Cat1 Id
             * Format: uuid
             */
            cat1_id: string;
            /**
             * Cat2 Id
             * Format: uuid
             */
            cat2_id: string;
            /**
             * Cat3 Id
             * Format: uuid
             */
            cat3_id: string;
            /** Description */
            description?: string | null;
            /** Quantity */
            quantity: number | string;
            /**
             * Unit
             * @default unit
             * @enum {string}
             */
            unit: "unit" | "gram" | "kilogram" | "meter" | "liter";
            /** Photos */
            photos?: string[];
            /** Sale Price */
            sale_price?: number | string | null;
            /** Estimated Value */
            estimated_value?: number | string | null;
        };
        /**
         * TransformationSummaryOut
         * @description Una fila del historial de transformaciones.
         *
         *     Trae el resumen de las dos puntas —qué entró, qué salió— porque la
         *     pregunta que se le hace a esta lista es "¿de dónde salió este oro?", y
         *     obligar a abrir cada fila para responderla la volvería inútil.
         *
         *     No incluye `consumed`/`produced` completos a propósito: son dos consultas
         *     por fila y en una lista de cincuenta transformaciones eso es un problema
         *     de rendimiento sin nada a cambio. El detalle está en
         *     `GET /inventory/transformations/{id}`.
         */
        TransformationSummaryOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Number */
            number: number;
            /**
             * Transform Date
             * Format: date
             */
            transform_date: string;
            /** Reason */
            reason: string;
            /** Notes */
            notes: string | null;
            /** Extra Cost */
            extra_cost: string;
            /** Total Cost */
            total_cost: string;
            /** Input Count */
            input_count: number;
            /** Output Count */
            output_count: number;
            /** Input Names */
            input_names: string | null;
            /** Output Names */
            output_names: string | null;
            /** Created By Name */
            created_by_name: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /** UpdateUserRoleIn */
        UpdateUserRoleIn: {
            /**
             * Role Id
             * Format: uuid
             */
            role_id: string;
        };
        /** UserOut */
        UserOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Full Name */
            full_name: string;
            /** Email */
            email: string;
            /**
             * Role Id
             * Format: uuid
             */
            role_id: string;
            /** Status */
            status: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /** ValidationError */
        ValidationError: {
            /** Location */
            loc: (string | number)[];
            /** Message */
            msg: string;
            /** Error Type */
            type: string;
            /** Input */
            input?: unknown;
            /** Context */
            ctx?: Record<string, never>;
        };
        /** VoidSaleIn */
        VoidSaleIn: {
            /** Reason */
            reason: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    list_companies_api_v1_platform_companies_get: {
        parameters: {
            query?: {
                cursor?: string | null;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CursorPage_CompanyOut_"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_company_api_v1_platform_companies_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CompanyCreateIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CompanyCreatedOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_company_api_v1_platform_companies__company_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                company_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CompanyOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    suspend_company_api_v1_platform_companies__company_id__suspend_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                company_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CompanyOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    activate_company_api_v1_platform_companies__company_id__activate_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                company_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CompanyOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    extend_subscription_api_v1_platform_companies__company_id__subscription_extend_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                company_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SubscriptionExtendIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_subscription_events_api_v1_platform_companies__company_id__subscription_events_get: {
        parameters: {
            query?: {
                cursor?: string | null;
                limit?: number;
            };
            header?: never;
            path: {
                company_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CursorPage_SubscriptionEventOut_"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_company_audit_log_api_v1_platform_companies__company_id__audit_log_get: {
        parameters: {
            query?: {
                cursor?: string | null;
                limit?: number;
                module?: string | null;
                entity_type?: string | null;
                entity_id?: string | null;
                user_id?: string | null;
            };
            header?: never;
            path: {
                company_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CursorPage_AuditLogOut_"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_plans_api_v1_platform_plans_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PlanOut"][];
                };
            };
        };
    };
    list_users_api_v1_identity_users_get: {
        parameters: {
            query?: {
                cursor?: string | null;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CursorPage_UserOut_"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    invite_user_api_v1_identity_invitations_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["InviteUserIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InvitedUserOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    update_user_role_api_v1_identity_users__user_id__role_patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                user_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateUserRoleIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    deactivate_user_api_v1_identity_users__user_id__deactivate_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                user_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    reactivate_user_api_v1_identity_users__user_id__reactivate_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                user_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_roles_api_v1_identity_roles_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RoleOut"][];
                };
            };
        };
    };
    create_role_api_v1_identity_roles_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RoleCreateIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RoleOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    rename_role_api_v1_identity_roles__role_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                role_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RoleRenameIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RoleOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_role_permissions_api_v1_identity_roles__role_id__permissions_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                role_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": string[];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    update_role_permissions_api_v1_identity_roles__role_id__permissions_put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                role_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RolePermissionsIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": string[];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_permissions_api_v1_identity_permissions_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PermissionOut"][];
                };
            };
        };
    };
    generate_recovery_link_api_v1_identity_users__user_id__recovery_link_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                user_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RecoveryLinkOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_me_api_v1_me_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MeOut"];
                };
            };
        };
    };
    update_me_api_v1_me_patch: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MeUpdateIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MeOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_transfers_api_v1_accounts_transfers_get: {
        parameters: {
            query?: {
                cursor?: string | null;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CursorPage_TransferOut_"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_transfer_api_v1_accounts_transfers_post: {
        parameters: {
            query?: never;
            header?: {
                "Idempotency-Key"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TransferIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TransferOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_accounts_api_v1_accounts_get: {
        parameters: {
            query?: {
                include_inactive?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccountOut"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_account_api_v1_accounts_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AccountCreateIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccountOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    update_account_api_v1_accounts__account_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                account_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AccountUpdateIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccountOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    settle_account_api_v1_accounts__account_id__settle_post: {
        parameters: {
            query?: never;
            header?: {
                "Idempotency-Key"?: string | null;
            };
            path: {
                account_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SettlementIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SettlementOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_statement_api_v1_accounts__account_id__statement_get: {
        parameters: {
            query: {
                /** @description Inclusivo, en la zona horaria de la empresa. */
                from_date: string;
                /** @description Inclusivo, en la zona horaria de la empresa. */
                to_date: string;
            };
            header?: never;
            path: {
                account_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccountStatementOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_settings_api_v1_company_settings_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CompanySettingsOut"];
                };
            };
        };
    };
    update_settings_api_v1_company_settings_patch: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CompanySettingsUpdateIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CompanySettingsOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_document_templates_api_v1_company_document_templates_get: {
        parameters: {
            query: {
                document_type: "contract" | "settlement";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DocumentTemplateOut"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_document_template_api_v1_company_document_templates_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DocumentTemplateCreateIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DocumentTemplateOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_active_document_template_api_v1_company_document_templates_active_get: {
        parameters: {
            query: {
                document_type: "contract" | "settlement";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DocumentTemplateOut"] | null;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    delete_document_template_api_v1_company_document_templates__template_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                template_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    update_document_template_api_v1_company_document_templates__template_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                template_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DocumentTemplateUpdateIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DocumentTemplateOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    activate_document_template_api_v1_company_document_templates__template_id__activate_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                template_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DocumentTemplateOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_customers_api_v1_customers_get: {
        parameters: {
            query?: {
                cursor?: string | null;
                limit?: number;
                /** @description Búsqueda por nombre o número de documento */
                q?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CursorPage_CustomerOut_"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_customer_api_v1_customers_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CustomerCreateIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_customer_api_v1_customers__customer_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                customer_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    update_customer_api_v1_customers__customer_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                customer_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CustomerUpdateIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_categories_api_v1_catalogs_categories_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CategoryOut"][];
                };
            };
        };
    };
    create_category_api_v1_catalogs_categories_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CategoryCreateIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CategoryOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_category_api_v1_catalogs_categories__category_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                category_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CategoryOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    update_category_api_v1_catalogs_categories__category_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                category_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CategoryUpdateIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CategoryOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_suppliers_api_v1_catalogs_suppliers_get: {
        parameters: {
            query?: {
                cursor?: string | null;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CursorPage_SupplierOut_"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_supplier_api_v1_catalogs_suppliers_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SupplierCreateIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SupplierOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_supplier_api_v1_catalogs_suppliers__supplier_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                supplier_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SupplierOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    update_supplier_api_v1_catalogs_suppliers__supplier_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                supplier_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SupplierUpdateIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SupplierOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_supplier_summary_api_v1_catalogs_suppliers__supplier_id__summary_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                supplier_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SupplierSummaryOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_supplier_purchases_api_v1_catalogs_suppliers__supplier_id__purchases_get: {
        parameters: {
            query?: {
                cursor?: string | null;
                limit?: number;
            };
            header?: never;
            path: {
                supplier_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CursorPage_SupplierPurchaseOut_"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_ready_for_auction_api_v1_contracts_ready_for_auction_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ContractOut"][];
                };
            };
        };
    };
    list_contracts_api_v1_contracts_get: {
        parameters: {
            query?: {
                cursor?: string | null;
                limit?: number;
                status?: string | null;
                customer_id?: string | null;
                /** @description Número, código anterior o nombre/documento del cliente */
                q?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CursorPage_ContractOut_"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_contract_api_v1_contracts_post: {
        parameters: {
            query?: never;
            header?: {
                "Idempotency-Key"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ContractCreateIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ContractOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    import_contract_api_v1_contracts_import_post: {
        parameters: {
            query?: never;
            header?: {
                "Idempotency-Key"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ContractImportIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ContractOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_contract_api_v1_contracts__contract_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                contract_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ContractOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    update_contract_api_v1_contracts__contract_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                contract_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ContractUpdateIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ContractOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_payment_options_api_v1_contracts__contract_id__payment_options_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                contract_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaymentQuoteOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_payments_api_v1_contracts__contract_id__payments_get: {
        parameters: {
            query?: {
                cursor?: string | null;
                limit?: number;
            };
            header?: never;
            path: {
                contract_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CursorPage_PaymentOut_"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_payment_api_v1_contracts__contract_id__payments_post: {
        parameters: {
            query?: never;
            header?: {
                "Idempotency-Key"?: string | null;
            };
            path: {
                contract_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PaymentCreateIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaymentOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_settlement_info_api_v1_contracts__contract_id__settlement_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                contract_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SettlementInfoOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    auction_contract_api_v1_contracts__contract_id__auction_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                contract_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ContractOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    open_session_api_v1_cashbox_sessions_open_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SessionOpenIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_current_session_api_v1_cashbox_sessions_current_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionOut"];
                };
            };
        };
    };
    get_today_session_api_v1_cashbox_sessions_today_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionOut"];
                };
            };
        };
    };
    list_sessions_api_v1_cashbox_sessions_get: {
        parameters: {
            query?: {
                cursor?: string | null;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CursorPage_SessionOut_"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_session_api_v1_cashbox_sessions__session_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                session_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_session_report_api_v1_cashbox_sessions__session_id__report_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                session_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionReportOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    close_session_api_v1_cashbox_sessions__session_id__close_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                session_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SessionCloseIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    reopen_session_api_v1_cashbox_sessions__session_id__reopen_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                session_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SessionReopenIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_expense_categories_api_v1_cashbox_expense_categories_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExpenseCategoryOut"][];
                };
            };
        };
    };
    create_expense_category_api_v1_cashbox_expense_categories_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ExpenseCategoryCreateIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExpenseCategoryOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_expenses_api_v1_cashbox_expenses_get: {
        parameters: {
            query?: {
                session_id?: string | null;
                cursor?: string | null;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CursorPage_ExpenseOut_"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_expense_api_v1_cashbox_expenses_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ExpenseCreateIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExpenseOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_entries_api_v1_inventory_entries_get: {
        parameters: {
            query?: {
                cursor?: string | null;
                limit?: number;
                supplier_id?: string | null;
                /** @description purchase | initial_stock | adjustment_in | other | auction */
                origin_type?: string | null;
                /** @description pending (compras por pagar) | paid */
                payment_status?: string | null;
                /** @description Sobre `entry_date`, inclusivo. */
                from_date?: string | null;
                /** @description Sobre `entry_date`, inclusivo. */
                to_date?: string | null;
                /** @description Número del ingreso o factura del proveedor. */
                q?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CursorPage_EntryOut_"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_entry_api_v1_inventory_entries_post: {
        parameters: {
            query?: never;
            header?: {
                "Idempotency-Key"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EntryCreateIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EntryOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    pay_entry_api_v1_inventory_entries__entry_id__pay_post: {
        parameters: {
            query?: never;
            header?: {
                "Idempotency-Key"?: string | null;
            };
            path: {
                entry_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EntryPayIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EntryOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_entry_api_v1_inventory_entries__entry_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                entry_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EntryOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_exits_api_v1_inventory_exits_get: {
        parameters: {
            query?: {
                cursor?: string | null;
                limit?: number;
                /** @description adjustment | damage | loss | supplier_return | internal_use */
                exit_type?: string | null;
                from_date?: string | null;
                to_date?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CursorPage_ExitOut_"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_exit_api_v1_inventory_exits_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ExitCreateIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExitOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_items_api_v1_inventory_items_get: {
        parameters: {
            query?: {
                cursor?: string | null;
                limit?: number;
                status?: string | null;
                /** @description Código (prefijo, sin mayúsculas) o nombre (full-text español). */
                q?: string | null;
                cat1_id?: string | null;
                cat2_id?: string | null;
                cat3_id?: string | null;
                supplier_id?: string | null;
                /** @description supplier | auction | other */
                origin?: string | null;
                /** @description Artículos puntuales (repetible: ?ids=..&ids=..). Ignora cursor. */
                ids?: string[] | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CursorPage_ItemOut_"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_item_api_v1_inventory_items__item_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                item_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    update_item_api_v1_inventory_items__item_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                item_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ItemUpdateIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    publish_item_api_v1_inventory_items__item_id__publish_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                item_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ItemPublishIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_products_api_v1_inventory_products_get: {
        parameters: {
            query?: {
                cursor?: string | null;
                limit?: number;
                /** @description SKU (prefijo) o nombre (full-text español). */
                q?: string | null;
                /** @description Incluir piezas de remate, que son productos de un solo lote. */
                include_unique?: boolean;
                cat1_id?: string | null;
                cat2_id?: string | null;
                cat3_id?: string | null;
                /** @description Productos con al menos un lote de ese proveedor. */
                supplier_id?: string | null;
                /** @description Solo lo que tiene unidades disponibles. */
                in_stock?: boolean;
                active?: boolean | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CursorPage_ProductOut_"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_product_lots_api_v1_inventory_products__product_id__lots_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                product_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemOut"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    update_product_api_v1_inventory_products__product_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                product_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProductUpdateIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProductOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_product_kardex_api_v1_inventory_products__product_id__kardex_get: {
        parameters: {
            query?: {
                /** @description Inclusivo. Por defecto, desde el primer movimiento. */
                from_date?: string | null;
                /** @description Inclusivo. Por defecto, hoy. */
                to_date?: string | null;
            };
            header?: never;
            path: {
                product_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["KardexOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_product_purchases_api_v1_inventory_products__product_id__purchases_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                product_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProductPurchaseOut"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_transformations_api_v1_inventory_transformations_get: {
        parameters: {
            query?: {
                cursor?: string | null;
                limit?: number;
                from_date?: string | null;
                to_date?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CursorPage_TransformationSummaryOut_"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_transformation_api_v1_inventory_transformations_post: {
        parameters: {
            query?: never;
            header?: {
                "Idempotency-Key"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TransformationCreateIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TransformationOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_transformation_api_v1_inventory_transformations__transformation_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                transformation_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TransformationOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_sales_api_v1_sales_get: {
        parameters: {
            query?: {
                cursor?: string | null;
                limit?: number;
                customer_id?: string | null;
                status?: string | null;
                from_date?: string | null;
                to_date?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CursorPage_SaleOut_"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_sale_api_v1_sales_post: {
        parameters: {
            query?: never;
            header?: {
                "Idempotency-Key"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SaleCreateIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SaleOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_sale_api_v1_sales__sale_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                sale_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SaleOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    void_sale_api_v1_sales__sale_id__void_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                sale_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["VoidSaleIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SaleOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_returns_api_v1_sales__sale_id__returns_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                sale_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SaleReturnOut"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_return_api_v1_sales__sale_id__returns_post: {
        parameters: {
            query?: never;
            header?: {
                "Idempotency-Key"?: string | null;
            };
            path: {
                sale_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SaleReturnCreateIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SaleReturnOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_return_api_v1_sales__sale_id__returns__return_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                sale_id: string;
                return_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SaleReturnOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_credit_notes_api_v1_credit_notes_get: {
        parameters: {
            query?: {
                customer_id?: string | null;
                cursor?: string | null;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CursorPage_CreditNoteOut_"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_credit_note_api_v1_credit_notes__credit_note_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                credit_note_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CreditNoteOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_audit_log_api_v1_audit_log_get: {
        parameters: {
            query?: {
                cursor?: string | null;
                limit?: number;
                module?: string | null;
                entity_type?: string | null;
                entity_id?: string | null;
                user_id?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CursorPage_AuditLogOut_"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_dashboard_api_v1_reports_dashboard_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DashboardOut"];
                };
            };
        };
    };
    list_closings_api_v1_reports_closings_get: {
        parameters: {
            query?: {
                cursor?: string | null;
                limit?: number;
                from_date?: string | null;
                to_date?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CursorPage_ClosingHistoryOut_"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_closings_breakdown_api_v1_reports_closings_breakdown_get: {
        parameters: {
            query?: {
                from_date?: string | null;
                to_date?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClosingsBreakdownOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_profit_summary_api_v1_reports_profit_get: {
        parameters: {
            query: {
                /** @description Inclusivo, en la zona horaria de la empresa. */
                from_date: string;
                /** @description Inclusivo, en la zona horaria de la empresa. */
                to_date: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProfitSummaryOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_pawn_performance_api_v1_reports_pawn_performance_get: {
        parameters: {
            query: {
                /** @description Inclusivo, en la zona horaria de la empresa. */
                from_date: string;
                /** @description Inclusivo, en la zona horaria de la empresa. */
                to_date: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PawnPerformanceOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_payables_api_v1_reports_payables_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PayablesOut"];
                };
            };
        };
    };
    get_inventory_valuation_api_v1_reports_inventory_valuation_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InventoryValuationOut"];
                };
            };
        };
    };
    get_stale_inventory_api_v1_reports_stale_inventory_get: {
        parameters: {
            query?: {
                threshold_days?: number;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StaleInventoryOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_income_statement_api_v1_reports_income_statement_get: {
        parameters: {
            query: {
                /** @description Inclusivo, en la zona horaria de la empresa. */
                from_date: string;
                /** @description Inclusivo, en la zona horaria de la empresa. */
                to_date: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IncomeStatementOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_monthly_series_api_v1_reports_series_get: {
        parameters: {
            query?: {
                /** @description Meses hacia atrás, incluyendo el actual. */
                months?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MonthlySeriesOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    health_api_v1_health_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: string;
                    };
                };
            };
        };
    };
}

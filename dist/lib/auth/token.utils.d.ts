export interface VerifiedActor {
    rol: 'ADMIN' | 'DOCENTE';
    actorId: string;
    username: string;
    docenteId?: string;
    aulaId?: string;
}
export declare function issueAdminToken(username: string): string;
export declare function issueDocenteToken(docente: {
    id: string;
    username: string;
    aula_id: string;
}): string;
export declare function verifyBearerToken(authHeader?: string): VerifiedActor | null;

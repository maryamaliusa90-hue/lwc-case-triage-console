/**
 * Server side of the case triage console. Runs in user mode so the
 * running user's object, field and record access is always enforced.
 */
public with sharing class CaseTriageController {
    private static final Set<String> ALLOWED_PRIORITIES = new Set<String>{ 'High', 'Medium', 'Low' };

    @AuraEnabled(cacheable=true)
    public static List<Case> getOpenCases(String priority, Integer limitSize) {
        Integer rowLimit = (limitSize == null || limitSize < 1 || limitSize > 200) ? 50 : limitSize;
        if (String.isNotBlank(priority) && !ALLOWED_PRIORITIES.contains(priority)) {
            throw new AuraHandledException('Unsupported priority: ' + priority);
        }
        if (String.isBlank(priority)) {
            return [
                SELECT Id, CaseNumber, Subject, Priority, Status, Origin, CreatedDate, Owner.Name, Account.Name
                FROM Case
                WHERE IsClosed = FALSE
                WITH USER_MODE
                ORDER BY CreatedDate ASC
                LIMIT :rowLimit
            ];
        }
        return [
            SELECT Id, CaseNumber, Subject, Priority, Status, Origin, CreatedDate, Owner.Name, Account.Name
            FROM Case
            WHERE IsClosed = FALSE AND Priority = :priority
            WITH USER_MODE
            ORDER BY CreatedDate ASC
            LIMIT :rowLimit
        ];
    }

    @AuraEnabled
    public static Integer assignToMe(List<Id> caseIds) {
        if (caseIds == null || caseIds.isEmpty()) {
            return 0;
        }
        if (caseIds.size() > 200) {
            throw new AuraHandledException('Select 200 cases or fewer.');
        }
        List<Case> updates = new List<Case>();
        for (Id caseId : caseIds) {
            updates.add(new Case(Id = caseId, OwnerId = UserInfo.getUserId(), Status = 'Working'));
        }
        try {
            update as user updates;
        } catch (DmlException e) {
            throw new AuraHandledException('Could not assign cases: ' + e.getDmlMessage(0));
        }
        return updates.size();
    }
}

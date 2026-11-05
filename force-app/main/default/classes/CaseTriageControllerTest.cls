@IsTest
private class CaseTriageControllerTest {
    @TestSetup
    static void setup() {
        List<Case> cases = new List<Case>();
        for (Integer i = 0; i < 30; i++) {
            cases.add(
                new Case(
                    Subject = 'Synthetic case ' + i,
                    Priority = Math.mod(i, 3) == 0 ? 'High' : 'Low',
                    Status = 'New',
                    Origin = 'Web'
                )
            );
        }
        insert cases;
    }

    @IsTest
    static void filtersByPriority() {
        List<Case> high = CaseTriageController.getOpenCases('High', 50);
        Assert.areEqual(10, high.size());
        for (Case c : high) {
            Assert.areEqual('High', c.Priority);
        }
    }

    @IsTest
    static void blankPriorityReturnsAllOpenCases() {
        Assert.areEqual(30, CaseTriageController.getOpenCases(null, null).size());
    }

    @IsTest
    static void limitIsRespected() {
        Assert.areEqual(5, CaseTriageController.getOpenCases('', 5).size());
    }

    @IsTest
    static void invalidPriorityIsRejected() {
        try {
            CaseTriageController.getOpenCases('Urgent; DROP', 5);
            Assert.fail('Expected AuraHandledException');
        } catch (AuraHandledException e) {
            Assert.isNotNull(e);
        }
    }

    @IsTest
    static void assignToMeUpdatesOwnerAndStatus() {
        List<Id> ids = new List<Id>(new Map<Id, Case>([SELECT Id FROM Case LIMIT 5]).keySet());

        Test.startTest();
        Integer count = CaseTriageController.assignToMe(ids);
        Test.stopTest();

        Assert.areEqual(5, count);
        Assert.areEqual(
            5,
            [SELECT COUNT() FROM Case WHERE Id IN :ids AND OwnerId = :UserInfo.getUserId() AND Status = 'Working']
        );
    }

    @IsTest
    static void assignToMeWithNoIdsReturnsZero() {
        Assert.areEqual(0, CaseTriageController.assignToMe(new List<Id>()));
    }
}

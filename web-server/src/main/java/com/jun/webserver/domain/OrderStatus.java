package com.jun.webserver.domain;

public enum OrderStatus {
    PENDING("새 주문이 도착했습니다!"),
    ACCEPTED("사장님이 주문을 수락했습니다! (조리 중)"),
    COOKED("조리가 완료되었습니다! 기사님을 기다립니다."),
    DELIVERING("배달이 시작되었습니다!"),
    COMPLETE("배달이 완료되었습니다. 맛있게 드세요!"),
    REJECTED("주문이 거절되었습니다.");

    private final String notificationMessage;

    OrderStatus(String notificationMessage) {
        this.notificationMessage = notificationMessage;
    }

    public String getMessage() {
        return notificationMessage;
    }
}

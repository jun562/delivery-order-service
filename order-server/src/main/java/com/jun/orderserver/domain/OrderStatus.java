package com.jun.orderserver.domain;

public enum OrderStatus {
    PENDING("주문 확인중"),
    ACCEPTED("조리 중"),
    COOKED("배달 대기 (조리 완료)"),
    DELIVERING("배달 중"),
    COMPLETE("배달 완료"),
    REJECTED("주문 거절됨");

    private final String description;

    OrderStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}

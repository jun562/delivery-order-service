package com.jun.orderserver.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "orders")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {
    @Id
    @Column(name = "order_id") // UUID를 문자열로 저장
    private String orderId;

    private String customerId;
    private String restaurantId;
    private String menuName;
    private Integer price;
    private String status;

    public void changeStatus(String newStatus) {
        this.status = newStatus;
    }
}

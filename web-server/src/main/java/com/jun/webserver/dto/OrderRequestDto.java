package com.jun.webserver.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OrderRequestDto {
    private String customerId;
    private String restaurantId;
    private String menuName;
    private int price;
}

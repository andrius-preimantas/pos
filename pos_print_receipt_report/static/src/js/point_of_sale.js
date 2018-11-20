openerp.pos_print_receipt_report = function (instance) {
    var _t = instance.web._t,
        _lt = instance.web._lt;
    var QWeb = instance.web.qweb;

    var error_message = {
        message: _t('Unable to print receipt'),
        comment: _t('Server or internet connection is down. Consider printing receipt directly (hint: on Windows press Ctrl + P)'),
    }

    var receipt_report_xml_id = 'point_of_sale.action_report_pos_receipt';
    var PosModelSuper = instance.point_of_sale.PosModel;

    instance.point_of_sale.PosModel = instance.point_of_sale.PosModel.extend({

        _get_report_action: function(selectedOrder, report_xml_id) {
            return this.pos_widget.do_action(
                report_xml_id,
                {additional_context: {active_ids:[selectedOrder.server_id], active_model:'pos.order'}}
            )
        },

        _get_order_record: function(selectedOrder) {
            var pos_reference = selectedOrder.attributes.name;
            if (!pos_reference) {
                to_ret = $.Deferred();
                to_ret.resolve();
                return to_ret;
            }

            var pos_order = new instance.web.Model('pos.order').query(['id']).filter(
                    [['pos_reference', '=', pos_reference]]).first();

            return pos_order;
        },

        get_order_report: function(selectedOrder, report_xml_id) {
            var to_ret = $.Deferred()

            if (selectedOrder && selectedOrder.server_id) {
                var action = this._get_report_action(selectedOrder, report_xml_id);

                action.fail(function() {
                    to_ret.reject()
                });

                action.done(function() {
                    to_ret.resolve()
                });
            } else {
                to_ret.resolve()
            }

            return to_ret;
        },

        print_pos_report: function(selectedOrder, report_xml_id) {
            var self = this;
            var order = self._get_order_record(selectedOrder);

            order.done(function(order_rec) {
                if (order_rec) {
                    selectedOrder.server_id = order_rec.id;
                    return self.get_order_report(selectedOrder, report_xml_id);
                } else {
                    var to_ret = $.Deferred()
                    to_ret.reject()
                    return to_ret;
                }
            });

            return order;
        },

        _flush_orders: function(orders, options) {
            var to_ret = PosModelSuper.prototype._flush_orders.call(this, orders, options);
            options = options || {};
            if (options.to_invoice) {
                return to_ret;
            }
            var self = this;
            var selectedOrder = self.pos_widget.pos.get('selectedOrder');

            return to_ret.then(function () {
                var order = self._get_order_record(selectedOrder);
                return order.done(function(order_rec) {
                    var to_ret = $.Deferred();
                    if (order_rec) {
                        selectedOrder.server_id = order_rec.id;
                        to_ret.resolve();
                    } else {
                        to_ret.reject();
                    }
                    return to_ret;
                });
            });
        },
    });

    instance.point_of_sale.ReceiptScreenWidget.include({

        print: function() {
            var self = this;
            var selectedOrder = self.pos.get('selectedOrder');

            self.pos.get_order_report(selectedOrder, receipt_report_xml_id).fail(function() {
                self.pos_widget.screen_selector.show_popup('error', error_message);
            });
        },
    });
};
